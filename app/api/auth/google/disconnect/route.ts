import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/request-context";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = performance.now();

  try {
    logger.info('auth_google_disconnect_request_received', {
      requestId,
      endpoint: '/api/auth/google/disconnect',
      method: 'POST',
    });

    const { userId } = await auth();
    if (!userId) {
      logger.warn('auth_google_disconnect_not_authenticated', { requestId });
      return NextResponse.json(
        createErrorResponse(
          new AppError(ErrorMessages.NOT_AUTHENTICATED),
          requestId
        ),
        { status: 401 }
      );
    }

    logger.info('auth_google_disconnect_updating_user', {
      requestId,
      userId,
    });

    await prisma.user.update({
      where: {
        clerkId: userId,
      },
      data: {
        calenderConnected: false,
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      },
    });

    const duration = performance.now() - startTime;
    logger.info('auth_google_disconnect_success', {
      requestId,
      userId,
      duration: Math.round(duration),
    });

    const res = NextResponse.json({
      success: true,
      message: "Calendar disconnected successfully",
    });
    res.headers.set('X-Request-Id', requestId);
    return res;

  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('auth_google_disconnect_unexpected_error', error, {
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
