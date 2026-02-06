import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { WebClient } from "@slack/web-api";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/request-context";

export async function POST(request: NextRequest) {
    const requestId = generateRequestId();
    const startTime = performance.now();
    let dbUser = null;

    try {
        logger.info('slack_post_meeting_request_received', {
            requestId,
            endpoint: '/api/slack/post-meeting',
            method: 'POST',
        });

        const user = await currentUser();

        if (!user) {
            logger.warn('slack_post_meeting_unauthorized', { requestId });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.NOT_AUTHENTICATED),
                    requestId
                ),
                { status: 401 }
            );
        }

        const { meetingId, summary, actionItems } = await request.json();

        logger.info('slack_post_meeting_lookup_user', {
            requestId,
            clerkId: user.id,
        });

        dbUser = await prisma.user.findFirst({
            where: {
                clerkId: user.id
            }
        });

        if (!dbUser || !dbUser.slackTeamId) {
            logger.warn('slack_post_meeting_not_connected', {
                requestId,
                hasUser: !!dbUser,
                hasTeamId: !!dbUser?.slackTeamId,
            });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.INTEGRATION_NOT_CONFIGURED),
                    requestId
                ),
                { status: 400 }
            );
        }

        logger.info('slack_post_meeting_lookup_installation', {
            requestId,
            teamId: dbUser.slackTeamId,
        });

        const installation = await prisma.slackInstallation.findUnique({
            where: {
                teamId: dbUser.slackTeamId
            }
        });

        if (!installation) {
            logger.warn('slack_post_meeting_installation_not_found', {
                requestId,
                teamId: dbUser.slackTeamId,
            });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.INTEGRATION_NOT_CONFIGURED),
                    requestId
                ),
                { status: 400 }
            );
        }

        const slack = new WebClient(installation.botToken);
        const targetChannel = dbUser.preferredChannelId || '#general';

        logger.info('slack_post_meeting_fetching_meeting', {
            requestId,
            meetingId,
        });

        const meeting = await prisma.meeting.findUnique({
            where: {
                id: meetingId
            }
        });

        const meetingTitle = meeting?.title;

        logger.info('slack_post_meeting_posting', {
            requestId,
            channel: targetChannel,
            meetingId,
        });

        await slack.chat.postMessage({
            channel: targetChannel,
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "📝 Meeting Summary",
                        emoji: true
                    }
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Meeting:*\n${meetingTitle}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Date:*\n${meeting?.startTime}`
                        }
                    ]
                },
                {
                    type: "divider"
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*📋 Summary:*\n${summary}`
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*✅ Action Items:*\n${actionItems}`
                    }
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: `Posted by ${user.firstName || 'User'} · ${new Date().toLocaleString()}`
                        }
                    ]
                }
            ]
        });

        const duration = performance.now() - startTime;
        logger.info('slack_post_meeting_success', {
            requestId,
            userId: dbUser.id,
            channel: targetChannel,
            duration: Math.round(duration),
        });

        const res = NextResponse.json({
            success: true,
            message: `Meeting summary posted to ${dbUser.preferredChannelName || '#general'}`
        });
        res.headers.set('X-Request-Id', requestId);
        return res;

    } catch (error) {
        const duration = performance.now() - startTime;
        logger.error('slack_post_meeting_unexpected_error', error, {
            requestId,
            duration: Math.round(duration),
        });

        const appError = new AppError(ErrorMessages.INTEGRATION_ERROR);
        const res = NextResponse.json(
            createErrorResponse(appError, requestId),
            { status: appError.statusCode }
        );
        res.headers.set('X-Request-Id', requestId);
        return res;
    }
}
