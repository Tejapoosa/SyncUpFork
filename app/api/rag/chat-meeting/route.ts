import { chatWithMeeting } from "@/lib/rag";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { validateRequest } from "@/lib/validation";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { checkRateLimit, RateLimits } from "@/lib/rate-limit";
import { generateRequestId } from "@/lib/request-context";

const chatMeetingRequestSchema = {
  validate: (data: any) => {
    const errors = [];
    if (!data.meetingId || typeof data.meetingId !== 'string') errors.push('meetingId required');
    if (!data.question || typeof data.question !== 'string') errors.push('question required');
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
        logger.info('chat_meeting_request_received', {
            requestId,
            endpoint: '/api/rag/chat-meeting',
            method: 'POST',
        });

        const { userId } = await auth();
        if (!userId) {
            logger.warn('chat_meeting_not_authenticated', { requestId });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.NOT_AUTHENTICATED),
                    requestId
                ),
                { status: 401 }
            );
        }

        const body = await request.json();
        const validation = chatMeetingRequestSchema.validate(body);
        if (!validation.valid) {
            logger.warn('chat_meeting_validation_failed', {
                requestId,
                error: validation.error,
            });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.VALIDATION_FAILED('meetingId and question')),
                    requestId
                ),
                { status: 400 }
            );
        }

        const { meetingId, question } = validation.data;

        try {
            checkRateLimit(userId, RateLimits.CHAT_MESSAGES);
        } catch (error) {
            logger.warn('chat_meeting_rate_limit_exceeded', {
                requestId,
                userId,
            });
            const appError = error instanceof AppError ? error : new AppError(ErrorMessages.RATE_LIMIT_EXCEEDED(50, '24h'));
            return NextResponse.json(
                createErrorResponse(appError, requestId),
                { status: appError.statusCode }
            );
        }

        logger.info('chat_meeting_processing', {
            requestId,
            userId,
            meetingId,
            questionLength: question.length,
        });

        const response = await chatWithMeeting(userId, meetingId, question);

        const duration = performance.now() - startTime;
        logger.info('chat_meeting_response_sent', {
            requestId,
            userId,
            duration: Math.round(duration),
            answerLength: response.answer?.length || 0,
        });

        const res = NextResponse.json(response);
        res.headers.set('X-Request-Id', requestId);
        return res;

    } catch (error) {
        const duration = performance.now() - startTime;

        if (error instanceof AppError) {
            logger.error('chat_meeting_app_error', error, {
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

        logger.error('chat_meeting_unexpected_error', error, {
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
