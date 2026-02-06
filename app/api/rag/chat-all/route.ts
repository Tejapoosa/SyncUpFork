import { prisma } from "@/lib/db";
import { AppError, createErrorResponse, ErrorMessages } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { chatWithAllMeetings } from "@/lib/rag";
import { checkRateLimit, RateLimits } from "@/lib/rate-limit";
import { generateRequestId } from "@/lib/request-context";
import { chatRequestSchema, validateRequest } from "@/lib/validation";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Ensure environment variables are loaded
import dotenv from 'dotenv';
dotenv.config();

export async function POST(request: NextRequest) {
    const requestId = generateRequestId();
    const startTime = performance.now();

    try {
        logger.info('chat_all_request_received', {
            requestId,
            endpoint: '/api/rag/chat-all',
            method: 'POST',
        });

        const body = await request.json();

        // Validate request
        const validation = validateRequest(chatRequestSchema, body);
        if (!validation.valid) {
            logger.warn('chat_all_validation_failed', {
                requestId,
                error: validation.error,
            });
            return NextResponse.json(
                createErrorResponse(
                    new AppError({
                        ...ErrorMessages.VALIDATION_FAILED('question'),
                        details: { reason: validation.error }
                    }),
                    requestId
                ),
                { status: 400 }
            );
        }

        const { question, userId: slackUserId } = validation.data;

        let targetUserId = slackUserId;

        if (!slackUserId) {
            const { userId: clerkUserId } = await auth();
            if (!clerkUserId) {
                logger.warn('chat_all_not_authenticated', {
                    requestId,
                });
                return NextResponse.json(
                    createErrorResponse(
                        new AppError(ErrorMessages.NOT_AUTHENTICATED),
                        requestId
                    ),
                    { status: 401 }
                );
            }
            targetUserId = clerkUserId;
        } else {
            const user = await prisma.user.findUnique({
                where: { id: slackUserId },
                select: { clerkId: true }
            });

            if (!user) {
                logger.warn('chat_all_user_not_found', {
                    requestId,
                    slackUserId,
                });
                return NextResponse.json(
                    createErrorResponse(
                        new AppError(ErrorMessages.MEETING_NOT_FOUND),
                        requestId
                    ),
                    { status: 404 }
                );
            }

            targetUserId = user.clerkId;
        }

        // Check rate limit
        try {
            checkRateLimit(targetUserId, RateLimits.CHAT_MESSAGES);
        } catch (error) {
            logger.warn('chat_all_rate_limit_exceeded', {
                requestId,
                userId: targetUserId,
            });
            const appError = error instanceof AppError ? error : new AppError(ErrorMessages.RATE_LIMIT_EXCEEDED(50, '24h'));
            return NextResponse.json(
                createErrorResponse(appError, requestId),
                { status: appError.statusCode }
            );
        }

        logger.info('chat_all_processing', {
            requestId,
            userId: targetUserId,
            questionLength: question.length,
        });

        const response = await chatWithAllMeetings(targetUserId, question);

        const duration = performance.now() - startTime;
        logger.info('chat_all_response_sent', {
            requestId,
            userId: targetUserId,
            duration: Math.round(duration),
            answerLength: response.answer?.length || 0,
        });

        const res = NextResponse.json(response);
        res.headers.set('X-Request-Id', requestId);
        return res;

    } catch (error) {
        const duration = performance.now() - startTime;

        if (error instanceof AppError) {
            logger.error('chat_all_app_error', error, {
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

        // Handle unexpected errors
        logger.error('chat_all_unexpected_error', error, {
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
