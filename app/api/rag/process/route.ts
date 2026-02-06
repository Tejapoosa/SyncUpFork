import { prisma } from "@/lib/db";
import { processTranscript } from "@/lib/rag";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { checkRateLimit, RateLimits } from "@/lib/rate-limit";
import { generateRequestId } from "@/lib/request-context";

const processRequestSchema = {
  validate: (data: any) => {
    const errors = [];
    if (!data.meetingId || typeof data.meetingId !== 'string') errors.push('meetingId required');
    if (!data.transcript || typeof data.transcript !== 'string') errors.push('transcript required');
    return {
      valid: errors.length === 0,
      error: errors.join(', '),
      data: errors.length === 0 ? data : null
    };
  }
};

export async function POST(request: NextRequest) {
    const requestId = generateRequestId();
    const startTime = performance.now();

    try {
        logger.info('rag_process_request_received', {
            requestId,
            endpoint: '/api/rag/process',
            method: 'POST',
        });

        const { userId } = await auth();
        if (!userId) {
            logger.warn('rag_process_not_authenticated', { requestId });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.NOT_AUTHENTICATED),
                    requestId
                ),
                { status: 401 }
            );
        }

        const body = await request.json();
        const validation = processRequestSchema.validate(body);
        if (!validation.valid) {
            logger.warn('rag_process_validation_failed', {
                requestId,
                error: validation.error,
            });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.VALIDATION_FAILED('meetingId and transcript')),
                    requestId
                ),
                { status: 400 }
            );
        }

        const { meetingId, transcript, meetingTitle } = validation.data;

        try {
            checkRateLimit(userId, RateLimits.RAG_PROCESS);
        } catch (error) {
            logger.warn('rag_process_rate_limit_exceeded', {
                requestId,
                userId,
            });
            const appError = error instanceof AppError ? error : new AppError(ErrorMessages.RATE_LIMIT_EXCEEDED(10, '1h'));
            return NextResponse.json(
                createErrorResponse(appError, requestId),
                { status: appError.statusCode }
            );
        }

        logger.info('rag_process_lookup_meeting', {
            requestId,
            userId,
            meetingId,
        });

        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            select: { ragProcessed: true, userId: true }
        });

        if (!meeting) {
            logger.warn('rag_process_meeting_not_found', {
                requestId,
                meetingId,
            });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.MEETING_NOT_FOUND),
                    requestId
                ),
                { status: 404 }
            );
        }

        if (meeting.userId !== userId) {
            logger.warn('rag_process_unauthorized', {
                requestId,
                userId,
                ownerId: meeting.userId,
            });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.UNAUTHORIZED),
                    requestId
                ),
                { status: 403 }
            );
        }

        if (meeting.ragProcessed) {
            logger.info('rag_process_already_processed', {
                requestId,
                meetingId,
            });
            const res = NextResponse.json({ success: true, message: 'already processed' });
            res.headers.set('X-Request-Id', requestId);
            return res;
        }

        logger.info('rag_process_started', {
            requestId,
            meetingId,
            transcriptLength: transcript.length,
        });

        await processTranscript(meetingId, userId, transcript, meetingTitle);

        await prisma.meeting.update({
            where: { id: meetingId },
            data: {
                ragProcessed: true,
                ragProcessedAt: new Date()
            }
        });

        const duration = performance.now() - startTime;
        logger.info('rag_process_completed', {
            requestId,
            userId,
            meetingId,
            duration: Math.round(duration),
        });

        const res = NextResponse.json({ success: true });
        res.headers.set('X-Request-Id', requestId);
        return res;

    } catch (error) {
        const duration = performance.now() - startTime;

        if (error instanceof AppError) {
            logger.error('rag_process_app_error', error, {
                requestId,
                duration: Math.round(duration),
                errorCode: error.code,
            });
            const res = NextResponse.json(
                createErrorResponse(error, requestId),
                { status: error.statusCode }
            );
            res.headers.set('X-Request-Id', requestId);
            return res;
        }

        logger.error('rag_process_unexpected_error', error, {
            requestId,
            duration: Math.round(duration),
        });

        const appError = new AppError(ErrorMessages.RAG_PROCESSING_FAILED);
        const res = NextResponse.json(
            createErrorResponse(appError, requestId),
            { status: appError.statusCode }
        );
        res.headers.set('X-Request-Id', requestId);
        return res;
    }
}
