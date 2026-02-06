import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/request-context";

export async function GET(request: NextRequest) {
    const requestId = generateRequestId();
    const startTime = performance.now();

    try {
        logger.info('auth_google_direct_connect_request_received', {
            requestId,
            endpoint: '/api/auth/google/direct-connect',
            method: 'GET',
        });

        const { userId } = await auth();
        if (!userId) {
            logger.warn('auth_google_direct_connect_not_authenticated', { requestId });
            return NextResponse.redirect('/sign-in');
        }

        logger.info('auth_google_direct_connect_building_url', {
            requestId,
            userId,
        });

        const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

        const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
        googleAuthUrl.searchParams.set('redirect_uri', process.env.GOOGLE_REDIRECT_URI!);
        googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly');
        googleAuthUrl.searchParams.set('response_type', 'code');
        googleAuthUrl.searchParams.set('access_type', 'offline');
        googleAuthUrl.searchParams.set('prompt', 'consent');
        googleAuthUrl.searchParams.set('state', state);

        const duration = performance.now() - startTime;
        logger.info('auth_google_direct_connect_redirecting', {
            requestId,
            userId,
            duration: Math.round(duration),
        });

        return NextResponse.redirect(googleAuthUrl.toString());

    } catch (error) {
        const duration = performance.now() - startTime;
        logger.error('auth_google_direct_connect_unexpected_error', error, {
            requestId,
            duration: Math.round(duration),
        });

        const appError = new AppError(ErrorMessages.INTEGRATION_ERROR);
        return NextResponse.json(
            createErrorResponse(appError, requestId),
            { status: appError.statusCode }
        );
    }
}
