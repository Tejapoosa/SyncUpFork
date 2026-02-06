import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/request-context";

const botSettingsSchema = {
  validate: (data: any) => {
    const errors = [];
    if (!data.botName || typeof data.botName !== 'string') errors.push('botName required');
    return {
      valid: errors.length === 0,
      error: errors.join(', '),
      data: errors.length === 0 ? data : null
    };
  }
};

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = performance.now();

  try {
    logger.info('user_bot_settings_get_request_received', {
      requestId,
      endpoint: '/api/user/bot-settings',
      method: 'GET',
    });

    const user = await currentUser();
    if (!user) {
      logger.warn('user_bot_settings_get_unauthorized', { requestId });
      return NextResponse.json(
        createErrorResponse(
          new AppError(ErrorMessages.NOT_AUTHENTICATED),
          requestId
        ),
        { status: 401 }
      );
    }

    logger.info('user_bot_settings_get_lookup', {
      requestId,
      userId: user.id,
    });

    const dbUser = await prisma.user.findUnique({
      where: {
        clerkId: user.id,
      },
      select: {
        botName: true,
        botImageUrl: true,
        currentPlan: true,
      },
    });

    const duration = performance.now() - startTime;
    logger.info('user_bot_settings_get_success', {
      requestId,
      userId: user.id,
      duration: Math.round(duration),
    });

    const res = NextResponse.json({
      botName: dbUser?.botName || "Meeting Bot",
      botImageUrl: dbUser?.botImageUrl || null,
      plan: dbUser?.currentPlan || "free",
    });
    res.headers.set('X-Request-Id', requestId);
    return res;

  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('user_bot_settings_get_unexpected_error', error, {
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

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = performance.now();

  try {
    logger.info('user_bot_settings_post_request_received', {
      requestId,
      endpoint: '/api/user/bot-settings',
      method: 'POST',
    });

    const user = await currentUser();
    if (!user) {
      logger.warn('user_bot_settings_post_unauthorized', { requestId });
      return NextResponse.json(
        createErrorResponse(
          new AppError(ErrorMessages.NOT_AUTHENTICATED),
          requestId
        ),
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = botSettingsSchema.validate(body);
    if (!validation.valid) {
      logger.warn('user_bot_settings_post_validation_failed', {
        requestId,
        error: validation.error,
      });
      return NextResponse.json(
        createErrorResponse(
          new AppError(ErrorMessages.VALIDATION_FAILED('botName')),
          requestId
        ),
        { status: 400 }
      );
    }

    const { botName, botImageUrl } = validation.data;

    logger.info('user_bot_settings_post_updating', {
      requestId,
      userId: user.id,
      botName,
    });

    await prisma.user.update({
      where: {
        clerkId: user.id,
      },
      data: {
        botName: botName || "Meeting Bot",
        botImageUrl: botImageUrl,
      },
    });

    const duration = performance.now() - startTime;
    logger.info('user_bot_settings_post_success', {
      requestId,
      userId: user.id,
      duration: Math.round(duration),
    });

    const res = NextResponse.json({ success: true });
    res.headers.set('X-Request-Id', requestId);
    return res;

  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('user_bot_settings_post_unexpected_error', error, {
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
