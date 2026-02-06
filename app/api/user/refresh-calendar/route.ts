import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { refreshGoogleTokenIfNeeded } from "@/lib/integrations/refreshTokenIfNeeded";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/request-context";

export async function POST(request: NextRequest) {
    const requestId = generateRequestId();
    const startTime = performance.now();

    try {
        logger.info('user_refresh_calendar_request_received', {
            requestId,
            endpoint: '/api/user/refresh-calendar',
            method: 'POST',
        });

        const { userId } = await auth();
        if (!userId) {
            logger.warn('user_refresh_calendar_not_authenticated', { requestId });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.NOT_AUTHENTICATED),
                    requestId
                ),
                { status: 401 }
            );
        }

        logger.info('user_refresh_calendar_lookup', {
            requestId,
            userId,
        });

        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
            select: {
                calenderConnected: true,
                googleAccessToken: true,
                googleRefreshToken: true,
                googleTokenExpiry: true,
            }
        });

        if (!user) {
            logger.warn('user_refresh_calendar_user_not_found', {
                requestId,
                userId,
            });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.USER_NOT_FOUND),
                    requestId
                ),
                { status: 404 }
            );
        }

        logger.info('user_refresh_calendar_refreshing', {
            requestId,
            userId,
            isConnected: user.calenderConnected,
        });

        // Try to refresh the Google token if needed
        const refreshResult = await refreshGoogleTokenIfNeeded(userId);

        // Check current connection status
        const isConnected = user.calenderConnected && !!user.googleAccessToken;

        const duration = performance.now() - startTime;
        logger.info('user_refresh_calendar_success', {
            requestId,
            userId,
            refreshed: refreshResult.success,
            connected: isConnected,
            duration: Math.round(duration),
        });

        const res = NextResponse.json({
            success: true,
            connected: isConnected,
            refreshed: refreshResult.success,
            message: isConnected
                ? "Calendar is connected"
                : "Calendar connection needs to be re-established"
        });
        res.headers.set('X-Request-Id', requestId);
        return res;

    } catch (error) {
        const duration = performance.now() - startTime;
        logger.error('user_refresh_calendar_unexpected_error', error, {
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
