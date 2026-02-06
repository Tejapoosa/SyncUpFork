import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { WebClient } from '@slack/web-api';
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/request-context";

export async function GET(request: NextRequest) {
    const requestId = generateRequestId();
    const startTime = performance.now();

    try {
        logger.info('slack_oauth_request_received', {
            requestId,
            endpoint: '/api/slack/oauth',
            method: 'GET',
        });

        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state');

        const host = request.headers.get('host');
        const isLocal = host?.includes('localhost');
        const protocol = isLocal ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;

        if (error) {
            logger.warn('slack_oauth_error', {
                requestId,
                error,
            });
            return NextResponse.redirect(`${baseUrl}/?slack=error`);
        }

        if (!code) {
            logger.warn('slack_oauth_no_code', {
                requestId,
            });
            return NextResponse.json({ error: 'no authorization code' }, { status: 400 });
        }

        logger.info('slack_oauth_exchanging_code', {
            requestId,
        });

        const redirectUri = `${baseUrl}/api/slack/oauth`;

        const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: process.env.SLACK_CLIENT_ID!,
                client_secret: process.env.SLACK_CLIENT_SECRET!,
                code: code,
                redirect_uri: redirectUri
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.ok) {
            logger.error('slack_oauth_token_exchange_failed', new Error('Token exchange failed'), {
                requestId,
                error: tokenData.error,
            });
            return NextResponse.redirect(`${baseUrl}/?slack=error`);
        }

        logger.info('slack_oauth_token_received', {
            requestId,
            teamId: tokenData.team.id,
        });

        const installation = await prisma.slackInstallation.upsert({
            where: {
                teamId: tokenData.team.id
            },
            update: {
                teamName: tokenData.team.name,
                botToken: tokenData.access_token,
                installedBy: tokenData.authed_user.id,
                installerName: tokenData.authed_user.name || 'Unknown',
                active: true,
                updatedAt: new Date()
            },
            create: {
                teamId: tokenData.team.id,
                teamName: tokenData.team.name,
                botToken: tokenData.access_token,
                installedBy: tokenData.authed_user.id,
                installerName: tokenData.authed_user.name || 'Unknown',
                active: true,
            }
        });

        logger.info('slack_oauth_installation_saved', {
            requestId,
            teamId: tokenData.team.id,
        });

        try {
            logger.info('slack_oauth_linking_user', {
                requestId,
                userId: tokenData.authed_user.id,
            });

            const slack = new WebClient(tokenData.access_token);
            const userInfo = await slack.users.info({ user: tokenData.authed_user.id });

            if (userInfo.user?.profile?.email) {
                await prisma.user.updateMany({
                    where: {
                        email: userInfo.user.profile.email
                    },
                    data: {
                        slackUserId: tokenData.authed_user.id,
                        slackTeamId: tokenData.team.id,
                        slackConnected: true
                    }
                });

                logger.info('slack_oauth_user_linked', {
                    requestId,
                    email: userInfo.user.profile.email,
                });
            }
        } catch (error) {
            logger.error('slack_oauth_user_linking_failed', error, {
                requestId,
            });
        }

        const returnTo = state?.startsWith('return=') ? state.split('return=')[1] : null;

        const duration = performance.now() - startTime;
        logger.info('slack_oauth_success', {
            requestId,
            teamId: tokenData.team.id,
            returnTo: returnTo,
            duration: Math.round(duration),
        });

        if (returnTo === 'integrations') {
            return NextResponse.redirect(`${baseUrl}/integrations?setup=slack`);
        } else {
            return NextResponse.redirect(`${baseUrl}/?slack=installed`);
        }

    } catch (error) {
        const duration = performance.now() - startTime;
        logger.error('slack_oauth_unexpected_error', error, {
            requestId,
            duration: Math.round(duration),
        });

        const host = request.headers.get('host');
        const isLocal = host?.includes('localhost');
        const protocol = isLocal ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;

        return NextResponse.redirect(`${baseUrl}/?slack=error`);
    }
}
