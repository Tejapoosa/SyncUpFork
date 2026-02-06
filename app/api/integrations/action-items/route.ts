import { prisma } from "@/lib/db";
import { AsanaAPI } from "@/lib/integrations/asana/asana";
import { JiraAPI } from "@/lib/integrations/jira/jira";
import { refreshTokenIfNeeded } from "@/lib/integrations/refreshTokenIfNeeded";
import { TrelloAPI } from "@/lib/integrations/trello/trello";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/request-context";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = performance.now();

  try {
    logger.info('integrations_action_items_request_received', {
      requestId,
      endpoint: '/api/integrations/action-items',
      method: 'POST',
    });

    const { userId } = await auth();

    if (!userId) {
      logger.warn('integrations_action_items_not_authenticated', { requestId });
      return NextResponse.json(
        createErrorResponse(
          new AppError(ErrorMessages.NOT_AUTHENTICATED),
          requestId
        ),
        { status: 401 }
      );
    }

    const { platform, actionItem, meetingId } = await request.json();

    if (!platform || !actionItem) {
      logger.warn('integrations_action_items_validation_failed', {
        requestId,
        hasPlatform: !!platform,
        hasActionItem: !!actionItem,
      });
      return NextResponse.json(
        createErrorResponse(
          new AppError(ErrorMessages.VALIDATION_FAILED('platform, actionItem')),
          requestId
        ),
        { status: 400 }
      );
    }

    logger.info('integrations_action_items_lookup', {
      requestId,
      userId,
      platform,
    });

    let integration = await prisma.userIntegration.findUnique({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
    });

    if (!integration) {
      logger.warn('integrations_action_items_not_found', {
        requestId,
        userId,
        platform,
      });
      return NextResponse.json(
        createErrorResponse(
          new AppError(ErrorMessages.INTEGRATION_NOT_CONFIGURED),
          requestId
        ),
        { status: 400 }
      );
    }

    if (platform === "jira" || platform === "asana") {
      try {
        logger.info('integrations_action_items_refreshing_token', {
          requestId,
          platform,
        });

        integration = await refreshTokenIfNeeded(integration);

      } catch (error) {
        logger.error('integrations_action_items_token_refresh_failed', error, {
          requestId,
          platform,
        });
        return NextResponse.json(
          createErrorResponse(
            new AppError(ErrorMessages.INTEGRATION_ERROR),
            requestId
          ),
          { status: 401 }
        );
      }
    }

    try {
      if (platform === "trello") {
        if (!integration.boardId) {
          logger.warn('integrations_action_items_board_not_configured', {
            requestId,
            platform,
          });
          return NextResponse.json(
            createErrorResponse(
              new AppError(ErrorMessages.INTEGRATION_NOT_CONFIGURED),
              requestId
            ),
            { status: 400 }
          );
        }

        logger.info('integrations_action_items_creating_trello_card', {
          requestId,
          boardId: integration.boardId,
        });

        const trello = new TrelloAPI();

        const lists = await trello.getBoardLists(
          integration.accessToken,
          integration.boardId
        );

        const todoList =
          lists.find(
            (list: any) =>
              list.name.toLowerCase().includes("to do") ||
              list.name.toLowerCase().includes("todo")
          ) || lists[0];

        if (!todoList) {
          logger.warn('integrations_action_items_no_suitable_list', {
            requestId,
          });
          return NextResponse.json(
            createErrorResponse(
              new AppError(ErrorMessages.INTEGRATION_ERROR),
              requestId
            ),
            { status: 400 }
          );
        }

        await trello.createCard(integration.accessToken, todoList.id, {
          title: actionItem,
          description: `Action item from meeting ${meetingId || "Unknown"}`,
        });

      } else if (platform === "jira") {
        if (!integration.projectId || !integration.workspaceId) {
          logger.warn('integrations_action_items_project_not_configured', {
            requestId,
            platform,
          });
          return NextResponse.json(
            createErrorResponse(
              new AppError(ErrorMessages.INTEGRATION_NOT_CONFIGURED),
              requestId
            ),
            { status: 400 }
          );
        }

        logger.info('integrations_action_items_creating_jira_issue', {
          requestId,
          projectId: integration.projectId,
        });

        const jira = new JiraAPI();

        const title = actionItem || "Untitled action item";
        const description = `Action item from meeting ${meetingId || "Unknown"}`;

        const issue = await jira.createIssue(
          integration.accessToken,
          integration.workspaceId,
          integration.projectId,
          {
            title,
            description,
          }
        );

      } else if (platform === "asana") {
        if (!integration.projectId) {
          logger.warn('integrations_action_items_asana_project_not_configured', {
            requestId,
            platform,
          });
          return NextResponse.json(
            createErrorResponse(
              new AppError(ErrorMessages.INTEGRATION_NOT_CONFIGURED),
              requestId
            ),
            { status: 400 }
          );
        }

        logger.info('integrations_action_items_creating_asana_task', {
          requestId,
          projectId: integration.projectId,
        });

        const asana = new AsanaAPI();

        await asana.createTask(integration.accessToken, integration.projectId, {
          title: actionItem,
          description: `Action item from meeting ${meetingId || "Unknown"}`,
        });

      } else if (platform === "slack") {
        if (!integration.boardId) {
          logger.warn('integrations_action_items_slack_channel_not_configured', {
            requestId,
          });
          return NextResponse.json(
            createErrorResponse(
              new AppError(ErrorMessages.INTEGRATION_NOT_CONFIGURED),
              requestId
            ),
            { status: 400 }
          );
        }

        logger.info('integrations_action_items_posting_slack_message', {
          requestId,
          channelId: integration.boardId,
        });

        const slackResponse = await fetch(
          "https://slack.com/api/chat.postMessage",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${integration.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              channel: integration.boardId,
              text: `📋 *Action Item from Meeting ${
                meetingId || "Unknown"
              }*\n${actionItem}`,
            }),
          }
        );

        const slackResult = await slackResponse.json();
        if (!slackResponse.ok) {
          throw new Error(`Slack API error: ${slackResult.error}`);
        }
      }

      const duration = performance.now() - startTime;
      logger.info('integrations_action_items_success', {
        requestId,
        userId,
        platform,
        duration: Math.round(duration),
      });

      const res = NextResponse.json({ success: true });
      res.headers.set('X-Request-Id', requestId);
      return res;

    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error('integrations_action_items_creation_failed', error, {
        requestId,
        platform,
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

  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('integrations_action_items_unexpected_error', error, {
      requestId,
      duration: Math.round(duration),
    });

    const appError = new AppError(ErrorMessages.INTERNAL_ERROR);
    const res = NextResponse.json(
      createErrorResponse(appError, requestId),
      { status: appError.statusCode }
    );
    res.headers.set('X-Request-Id', requestId);
    return res;
  }
}
