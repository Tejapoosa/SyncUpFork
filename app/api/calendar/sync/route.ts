import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { syncCalendarEventsToDatabase } from "@/lib/integrations/google/calendar";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/request-context";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = performance.now();

  try {
    logger.info('calendar_sync_request_received', {
      requestId,
      endpoint: '/api/calendar/sync',
      method: 'POST',
    });

    const { userId } = await auth();

    if (!userId) {
      logger.warn('calendar_sync_not_authenticated', { requestId });
      return NextResponse.json(
        createErrorResponse(
          new AppError(ErrorMessages.NOT_AUTHENTICATED),
          requestId
        ),
        { status: 401 }
      );
    }

    logger.info('calendar_sync_starting', {
      requestId,
      userId,
    });

    await syncCalendarEventsToDatabase(userId);

    const duration = performance.now() - startTime;
    logger.info('calendar_sync_success', {
      requestId,
      userId,
      duration: Math.round(duration),
    });

    const res = NextResponse.json({
      success: true,
      message: "Calendar events synced successfully"
    });
    res.headers.set('X-Request-Id', requestId);
    return res;

  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('calendar_sync_unexpected_error', error, {
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
