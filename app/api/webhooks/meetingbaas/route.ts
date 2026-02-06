import { processMeetingTranscript } from "@/lib/ai-processor";
import { prisma } from "@/lib/db";
import { sendMeetingSummaryEmail } from "@/lib/email-service-free";
import { processTranscript } from "@/lib/rag";
import { incrementMeetingUsage } from "@/lib/usage";
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/request-context";

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
});

export async function POST(request: NextRequest) {
    const requestId = generateRequestId();
    const startTime = performance.now();

    try {
        logger.info('webhook_meetingbaas_request_received', {
            requestId,
            endpoint: '/api/webhooks/meetingbaas',
            method: 'POST',
        });

        const webhook = await request.json();

        if (webhook.event === 'complete') {
            const webhookData = webhook.data;

            logger.info('webhook_meetingbaas_looking_up_meeting', {
                requestId,
                botId: webhookData.bot_id,
            });

            const meeting = await prisma.meeting.findFirst({
                where: {
                    botId: webhookData.bot_id
                },
                include: {
                    user: true
                }
            });

            if (!meeting) {
                logger.error('webhook_meetingbaas_meeting_not_found', new Error('Meeting not found'), {
                    requestId,
                    botId: webhookData.bot_id,
                });
                return NextResponse.json({ error: 'meeting not found' }, { status: 404 });
            }

            logger.info('webhook_meetingbaas_meeting_found', {
                requestId,
                meetingId: meeting.id,
                title: meeting.title,
            });

            await incrementMeetingUsage(meeting.userId);

            if (!meeting.user.email) {
                logger.error('webhook_meetingbaas_user_email_not_found', new Error('Email missing'), {
                    requestId,
                    meetingId: meeting.id,
                });
                return NextResponse.json({ error: 'user email not found' }, { status: 400 });
            }

            let recordingUrl = webhookData.mp4 || null;

            if (webhookData.mp4 && process.env.S3_BUCKET_NAME) {
                try {
                    logger.info('webhook_meetingbaas_uploading_to_s3', {
                        requestId,
                        meetingId: meeting.id,
                    });

                    const audioResponse = await fetch(webhookData.mp4);
                    if (audioResponse.ok) {
                        const audioBuffer = await audioResponse.arrayBuffer();
                        const s3Key = `recordings/${meeting.id}-${Date.now()}.mp4`;

                        const uploadCommand = new PutObjectCommand({
                            Bucket: process.env.S3_BUCKET_NAME!,
                            Key: s3Key,
                            Body: Buffer.from(audioBuffer),
                            ContentType: 'audio/mp4'
                        });

                        await s3Client.send(uploadCommand);
                        recordingUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

                        logger.info('webhook_meetingbaas_recording_uploaded', {
                            requestId,
                            meetingId: meeting.id,
                            s3Key,
                        });
                    }
                } catch (s3Error) {
                    logger.error('webhook_meetingbaas_s3_upload_failed', s3Error, {
                        requestId,
                        meetingId: meeting.id,
                    });
                    recordingUrl = webhookData.mp4;
                }
            }

            logger.info('webhook_meetingbaas_updating_meeting', {
                requestId,
                meetingId: meeting.id,
            });

            await prisma.meeting.update({
                where: {
                    id: meeting.id
                },
                data: {
                    meetingEnded: true,
                    transcriptReady: true,
                    transcript: webhookData.transcript || null,
                    recordingUrl: recordingUrl,
                    speakers: webhookData.speakers || null
                }
            });

            if (webhookData.transcript && !meeting.processed) {
                try {
                    logger.info('webhook_meetingbaas_processing_transcript', {
                        requestId,
                        meetingId: meeting.id,
                    });

                    const processed = await processMeetingTranscript(webhookData.transcript);

                    let transcriptText = '';

                    if (Array.isArray(webhookData.transcript)) {
                        transcriptText = webhookData.transcript
                            .map((item: {speaker?: string; words?: {word?: string}[]}) =>
                                `${item.speaker || 'Speaker'}: ${item.words?.map((w: {word?: string}) => w.word).join(' ') || ''}`)
                            .join('\n');
                    } else {
                        transcriptText = webhookData.transcript;
                    }

                    try {
                        logger.info('webhook_meetingbaas_sending_email', {
                            requestId,
                            meetingId: meeting.id,
                            userEmail: meeting.user.email,
                        });

                        await sendMeetingSummaryEmail({
                            userEmail: meeting.user.email,
                            userName: meeting.user.name || 'User',
                            meetingTitle: meeting.title,
                            summary: processed.summary,
                            actionItems: processed.actionItems,
                            meetingId: meeting.id,
                            meetingDate: meeting.startTime.toLocaleDateString()
                        });

                        await prisma.meeting.update({
                            where: {
                                id: meeting.id
                            },
                            data: {
                                emailSent: true,
                                emailSentAt: new Date()
                            }
                        });

                        logger.info('webhook_meetingbaas_email_sent', {
                            requestId,
                            meetingId: meeting.id,
                        });

                    } catch (emailError) {
                        logger.error('webhook_meetingbaas_email_failed', emailError, {
                            requestId,
                            meetingId: meeting.id,
                        });
                    }

                    await processTranscript(meeting.id, meeting.userId, transcriptText, meeting.title);

                    await prisma.meeting.update({
                        where: {
                            id: meeting.id
                        },
                        data: {
                            summary: processed.summary,
                            actionItems: processed.actionItems,
                            processed: true,
                            processedAt: new Date(),
                            ragProcessed: true,
                            ragProcessedAt: new Date()
                        }
                    });

                    logger.info('webhook_meetingbaas_transcript_processed', {
                        requestId,
                        meetingId: meeting.id,
                    });

                } catch (processingError) {
                    logger.error('webhook_meetingbaas_transcript_processing_failed', processingError, {
                        requestId,
                        meetingId: meeting.id,
                    });

                    await prisma.meeting.update({
                        where: {
                            id: meeting.id
                        },
                        data: {
                            processed: true,
                            processedAt: new Date(),
                            summary: 'processing failed. please check the transcript manually.',
                            actionItems: []
                        }
                    });
                }
            }

            const duration = performance.now() - startTime;
            logger.info('webhook_meetingbaas_success', {
                requestId,
                meetingId: meeting.id,
                duration: Math.round(duration),
                transcriptReceived: !!webhookData.transcript,
                recordingUploaded: recordingUrl !== webhookData.mp4,
            });

            return NextResponse.json({
                success: true,
                message: 'meeting processed successfully',
                meetingId: meeting.id,
                meetingTitle: meeting.title,
                transcriptReceived: !!webhookData.transcript,
                recordingUploaded: recordingUrl !== webhookData.mp4
            });
        }

        logger.info('webhook_meetingbaas_no_action_needed', {
            requestId,
            event: webhook.event,
        });

        return NextResponse.json({
            success: true,
            message: 'webhook received'
        });

    } catch (error) {
        const duration = performance.now() - startTime;
        logger.error('webhook_meetingbaas_unexpected_error', error, {
            requestId,
            duration: Math.round(duration),
        });

        return NextResponse.json({ error: 'internal server error' }, { status: 500 });
    }
}
