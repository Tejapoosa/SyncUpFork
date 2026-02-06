import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/request-context";

interface IntegrationStatus {
    platform: string;
    name: string;
    logo: string;
    connected: boolean;
    boardName?: string | null;
    projectName?: string | null;
    channelName?: string | null;
}

export async function GET(request: NextRequest) {
    const requestId = generateRequestId();
    const startTime = performance.now();

    try {
        logger.info('integrations_status_request_received', {
            requestId,
            endpoint: '/api/integrations/status',
            method: 'GET',
        });

        const user = await currentUser();

        if (!user) {
            logger.warn('integrations_status_unauthorized', { requestId });
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.NOT_AUTHENTICATED),
                    requestId
                ),
                { status: 401 }
            );
        }

        logger.info('integrations_status_lookup', {
            requestId,
            userId: user.id,
        });

        const integrations = await prisma.userIntegration.findMany({
            where: {
                userId: user.id
            }
        });

        const allPlatforms = [
            { platform: 'trello', name: 'Trello', logo: '🔷', connected: false },
            { platform: 'jira', name: 'Jira', logo: '🔵', connected: false },
            { platform: 'asana', name: 'Asana', logo: '🟠', connected: false }
        ];

        const result: IntegrationStatus[] = allPlatforms.map(platform => {
            const integration = integrations.find(i => i.platform === platform.platform);
            return {
                ...platform,
                connected: !!integration,
                boardName: integration?.boardName,
                projectName: integration?.projectName
            }
        });

        const dbUser = await prisma.user.findFirst({
            where: {
                clerkId: user.id
            }
        });

        if (dbUser?.slackConnected) {
            result.push({
                platform: 'slack',
                name: 'Slack',
                logo: '💬',
                connected: true,
                channelName: dbUser.preferredChannelName || 'Not Set'
            });
        } else {
            result.push({
                platform: 'slack',
                name: 'Slack',
                logo: '💬',
                connected: false,
            });
        }

        const duration = performance.now() - startTime;
        logger.info('integrations_status_success', {
            requestId,
            userId: user.id,
            integrationsCount: result.length,
            duration: Math.round(duration),
        });

        const res = NextResponse.json(result);
        res.headers.set('X-Request-Id', requestId);
        return res;

    } catch (error) {
        const duration = performance.now() - startTime;
        logger.error('integrations_status_unexpected_error', error, {
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
