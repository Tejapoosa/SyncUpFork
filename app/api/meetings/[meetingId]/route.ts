import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/request-context";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ meetingId: string }> }
) {
    const requestId = generateRequestId();
    const startTime = performance.now();

    try {
        logger.info('meeting_get_request_received', {
            requestId,
            endpoint: '/api/meetings/[meetingId]',
            method: 'GET',
        });

        const { userId: clerkUserId } = await auth();

        const { meetingId } = await params;

        // Allow development mode - skip auth check if no user
        if (!clerkUserId && process.env.NODE_ENV !== 'development') {
            logger.warn('meeting_get_not_authenticated', { requestId, meetingId });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.NOT_AUTHENTICATED),
                    requestId
                ),
                { status: 401 }
            );
        }

        logger.info('meeting_get_lookup', {
            requestId,
            meetingId,
            userId: clerkUserId || 'dev-mode',
        });

        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        clerkId: true
                    }
                }
            }
        });

        if (!meeting) {
            logger.warn('meeting_get_not_found', { requestId, meetingId });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.MEETING_NOT_FOUND),
                    requestId
                ),
                { status: 404 }
            );
        }

        const responseData = {
            ...meeting,
            isOwner: clerkUserId === meeting.user?.clerkId
        };

        const duration = performance.now() - startTime;
        logger.info('meeting_get_success', {
            requestId,
            meetingId,
            duration: Math.round(duration),
        });

        const res = NextResponse.json(responseData);
        res.headers.set('X-Request-Id', requestId);
        return res;

    } catch (error) {
        const duration = performance.now() - startTime;
        logger.error('meeting_get_unexpected_error', error, {
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

export async function DELETE(
    request: NextRequest,
    { params }: { params: { meetingId: string } }
) {
    const requestId = generateRequestId();
    const startTime = performance.now();

    try {
        logger.info('meeting_delete_request_received', {
            requestId,
            endpoint: '/api/meetings/[meetingId]',
            method: 'DELETE',
        });

        const { userId } = await auth();

        if (!userId) {
            logger.warn('meeting_delete_not_authenticated', { requestId });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.NOT_AUTHENTICATED),
                    requestId
                ),
                { status: 401 }
            );
        }

        const { meetingId } = params;

        logger.info('meeting_delete_lookup', {
            requestId,
            meetingId,
            userId,
        });

        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: { user: true }
        });

        if (!meeting) {
            logger.warn('meeting_delete_not_found', { requestId, meetingId });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.MEETING_NOT_FOUND),
                    requestId
                ),
                { status: 404 }
            );
        }

        if (meeting.user.clerkId !== userId) {
            logger.warn('meeting_delete_unauthorized', {
                requestId,
                meetingId,
                userId,
                ownerId: meeting.user.clerkId,
            });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.UNAUTHORIZED),
                    requestId
                ),
                { status: 403 }
            );
        }

        logger.info('meeting_delete_started', { requestId, meetingId, userId });

        await prisma.meeting.delete({
            where: { id: meetingId }
        });

        const duration = performance.now() - startTime;
        logger.info('meeting_delete_success', {
            requestId,
            meetingId,
            userId,
            duration: Math.round(duration),
        });

        const res = NextResponse.json({
            success: true,
            message: 'meeting deleted successfully'
        });
        res.headers.set('X-Request-Id', requestId);
        return res;

    } catch (error) {
        const duration = performance.now() - startTime;

        if (error instanceof AppError) {
            logger.error('meeting_delete_app_error', error, {
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

        logger.error('meeting_delete_unexpected_error', error, {
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
