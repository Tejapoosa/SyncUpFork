import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/request-context";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = performance.now();

  try {
    logger.info('admin_fix_action_items_request_received', {
      requestId,
      endpoint: '/api/admin/fix-action-items',
      method: 'POST',
    });

    const { userId } = await auth();

    if (!userId) {
      logger.warn('admin_fix_action_items_not_authenticated', { requestId });
      return NextResponse.json(
        createErrorResponse(
          new AppError(ErrorMessages.NOT_AUTHENTICATED),
          requestId
        ),
        { status: 401 }
      );
    }

    logger.info('admin_fix_action_items_lookup', {
      requestId,
      userId,
    });

    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      logger.warn('admin_fix_action_items_user_not_found', {
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

    logger.info('admin_fix_action_items_scanning_meetings', {
      requestId,
      userId: user.id,
    });

    const meetingsToCheck = await prisma.meeting.findMany({
      where: {
        userId: user.id
      }
    });

    logger.info('admin_fix_action_items_found_meetings', {
      requestId,
      count: meetingsToCheck.length,
    });

    const fixedMeetings = [];

    for (const meeting of meetingsToCheck) {
      if (meeting.actionItems) {
        try {
          const actionItems = meeting.actionItems;

          if (Array.isArray(actionItems) && actionItems.length > 0 && typeof actionItems[0] === 'string') {
            logger.info('admin_fix_action_items_fixing_meeting', {
              requestId,
              meetingId: meeting.id,
              title: meeting.title,
            });

            const fixedActionItems = actionItems.map((text, index) => ({
              id: `${meeting.id}_action_${index + 1}`,
              text: text
            }));

            await prisma.meeting.update({
              where: { id: meeting.id },
              data: {
                actionItems: fixedActionItems
              }
            });

            fixedMeetings.push({
              id: meeting.id,
              title: meeting.title,
              actionItemsCount: fixedActionItems.length
            });

            logger.info('admin_fix_action_items_fixed', {
              requestId,
              meetingId: meeting.id,
              count: fixedActionItems.length,
            });
          }
        } catch (error) {
          logger.error('admin_fix_action_items_meeting_error', error, {
            requestId,
            meetingId: meeting.id,
          });
        }
      }
    }

    const duration = performance.now() - startTime;
    logger.info('admin_fix_action_items_success', {
      requestId,
      userId: user.id,
      fixedCount: fixedMeetings.length,
      duration: Math.round(duration),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully fixed action items structure for ${fixedMeetings.length} meetings`,
      fixedMeetings
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('admin_fix_action_items_unexpected_error', error, {
      requestId,
      duration: Math.round(duration),
    });

    const appError = new AppError(ErrorMessages.DATABASE_ERROR);
    return NextResponse.json(
      createErrorResponse(appError, requestId),
      { status: appError.statusCode }
    );
  }
}
