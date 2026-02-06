import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/request-context";

export async function GET(request: NextRequest) {
    const requestId = generateRequestId();
    const startTime = performance.now();

    try {
        logger.info('slack_install_request_received', {
            requestId,
            endpoint: '/api/slack/install',
            method: 'GET',
        });

        const { searchParams } = new URL(request.url);
        const returnTo = searchParams.get('return');

        const redirectUri = process.env.SLACK_REDIRECT_URL as string;

        const state = returnTo ? `return=${returnTo}` : '';

        logger.info('slack_install_redirecting', {
            requestId,
            hasReturnTo: !!returnTo,
        });

        const slackInstallUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=app_mentions:read,channels:read,channels:history,groups:history,groups:read,chat:write,im:history,im:read,im:write,mpim:history,mpim:read,mpim:write,users:read,users:read.email&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;

        const duration = performance.now() - startTime;
        logger.info('slack_install_success', {
            requestId,
            duration: Math.round(duration),
        });

        return NextResponse.redirect(slackInstallUrl);

    } catch (error) {
        const duration = performance.now() - startTime;
        logger.error('slack_install_unexpected_error', error, {
            requestId,
            duration: Math.round(duration),
        });

        return NextResponse.redirect('/?error=slack_install_failed');
    }
}
