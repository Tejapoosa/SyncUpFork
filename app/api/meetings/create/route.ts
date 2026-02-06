import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { checkRateLimit, RateLimits } from "@/lib/rate-limit";
import { generateRequestId } from "@/lib/request-context";

const createMeetingSchema = {
  validate: (data: any) => {
    const errors = [];
    if (!data.title || typeof data.title !== 'string') errors.push('title required');
    if (!data.startTime || typeof data.startTime !== 'string') errors.push('startTime required');
    if (!data.endTime || typeof data.endTime !== 'string') errors.push('endTime required');
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
        logger.info('meeting_create_request_received', {
            requestId,
            endpoint: '/api/meetings/create',
            method: 'POST',
        });

        const { userId } = await auth();
        if (!userId) {
            logger.warn('meeting_create_not_authenticated', { requestId });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.NOT_AUTHENTICATED),
                    requestId
                ),
                { status: 401 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { clerkId: userId }
        });

        if (!user) {
            logger.warn('meeting_create_user_not_found', { requestId, userId });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.USER_NOT_FOUND),
                    requestId
                ),
                { status: 404 }
            );
        }

        try {
            checkRateLimit(userId, RateLimits.CREATE_MEETING);
        } catch (error) {
            logger.warn('meeting_create_rate_limit_exceeded', { requestId, userId });
            const appError = error instanceof AppError ? error : new AppError(ErrorMessages.RATE_LIMIT_EXCEEDED(100, '24h'));
            return NextResponse.json(
                createErrorResponse(appError, requestId),
                { status: appError.statusCode }
            );
        }

        const body = await request.json();
        const validation = createMeetingSchema.validate(body);
        if (!validation.valid) {
            logger.warn('meeting_create_validation_failed', {
                requestId,
                error: validation.error,
            });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.VALIDATION_FAILED('meeting fields')),
                    requestId
                ),
                { status: 400 }
            );
        }

        const {
            title,
            startTime: startTimeStr,
            endTime: endTimeStr,
            meetingUrl,
            description,
            attendees,
            calendarEventId
        } = validation.data;

        logger.info('meeting_create_processing', {
            requestId,
            userId,
            title,
            hasAttendees: !!attendees,
        });

        const meeting = await prisma.meeting.create({
            data: {
                userId: user.id,
                title,
                description,
                meetingUrl,
                startTime: new Date(startTimeStr),
                endTime: new Date(endTimeStr),
                attendees: attendees ? (attendees as any) : undefined,
                calendarEventId,
                isFromCalendar: !!calendarEventId,
                botScheduled: true,
                meetingEnded: false,
                transcriptReady: false,
            }
        });

        const duration = performance.now() - startTime;
        logger.info('meeting_create_success', {
            requestId,
            userId,
            meetingId: meeting.id,
            duration: Math.round(duration),
        });

        const res = NextResponse.json({
            success: true,
            meeting,
            message: "Meeting created successfully"
        });
        res.headers.set('X-Request-Id', requestId);
        return res;

    } catch (error) {
        const duration = performance.now() - startTime;

        if (error instanceof AppError) {
            logger.error('meeting_create_app_error', error, {
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

        logger.error('meeting_create_unexpected_error', error, {
            requestId,
            duration: Math.round(duration),
        });

        const appError = new AppError(ErrorMessages.DATABASE_ERROR);
        const res = NextResponse.json(
            createErrorResponse(appError, requestId),
            { status: appError.statusCode }
        );
        res.headers.set('X-Request-Id', requestId);
        return res;
    }
}
