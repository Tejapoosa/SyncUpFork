import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { refreshGoogleTokenIfNeeded } from "@/lib/integrations/refreshTokenIfNeeded";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/request-context";

export async function GET(request: NextRequest) {
    const requestId = generateRequestId();
    const startTime = performance.now();

    try {
        logger.info('user_calendar_status_request_received', {
            requestId,
            endpoint: '/api/user/calendar-status',
            method: 'GET',
        });

        const { userId } = await auth();
        if (!userId) {
            logger.info('user_calendar_status_not_authenticated', { requestId });
            return NextResponse.json({ connected: false });
        }

        logger.info('user_calendar_status_lookup', {
            requestId,
            userId,
        });

        const user = await prisma.user.findUnique({
            where: {
                clerkId: userId,
            },
            select: {
                calenderConnected: true,
                googleAccessToken: true,
                googleRefreshToken: true,
                googleTokenExpiry: true,
            },
        });

        if (!user) {
            logger.info('user_calendar_status_user_not_found', { requestId, userId });
            return NextResponse.json({ connected: false });
        }

        // Try to refresh token if user has a refresh token
        if (user.googleRefreshToken && user.calenderConnected) {
            try {
                logger.info('user_calendar_status_refreshing_token', {
                    requestId,
                    userId,
                });

                await refreshGoogleTokenIfNeeded(userId);

                // Refetch user data after potential refresh
                const refreshedUser = await prisma.user.findUnique({
                    where: { clerkId: userId },
                    select: {
                        calenderConnected: true,
                        googleAccessToken: true,
                    },
                });

                const duration = performance.now() - startTime;
                logger.info('user_calendar_status_token_refresh_success', {
                    requestId,
                    userId,
                    duration: Math.round(duration),
                });

                return NextResponse.json({
                    connected: refreshedUser?.calenderConnected && !!refreshedUser.googleAccessToken,
                });

            } catch (refreshError) {
                logger.error('user_calendar_status_token_refresh_failed', refreshError, {
                    requestId,
                    userId,
                });
                // Fall back to original logic
            }
        }

        const duration = performance.now() - startTime;
        logger.info('user_calendar_status_success', {
            requestId,
            userId,
            connected: user.calenderConnected && !!user.googleAccessToken,
            duration: Math.round(duration),
        });

        return NextResponse.json({
            connected: user.calenderConnected && !!user.googleAccessToken,
        });

    } catch (error) {
        const duration = performance.now() - startTime;
        logger.error('user_calendar_status_unexpected_error', error, {
            requestId,
            duration: Math.round(duration),
        });

        return NextResponse.json({ connected: false });
    }
}
