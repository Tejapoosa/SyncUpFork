import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/request-context";

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = performance.now();

  try {
    logger.info('auth_google_callback_request_received', {
      requestId,
      endpoint: '/api/auth/google/callback',
      method: 'GET',
    });

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      logger.warn('auth_google_callback_oauth_error', {
        requestId,
        error,
      });
      return NextResponse.redirect(
        new URL("/home?error=oauth_denied", request.url)
      );
    }

    if (!code || !state) {
      logger.warn('auth_google_callback_missing_params', {
        requestId,
        hasCode: !!code,
        hasState: !!state,
      });
      return NextResponse.redirect(
        new URL("/home?error=oauth_failed", request.url)
      );
    }

    logger.info('auth_google_callback_parsing_state', {
      requestId,
    });

    const { userId } = JSON.parse(Buffer.from(state, "base64").toString());

    logger.info('auth_google_callback_exchanging_code', {
      requestId,
      userId,
    });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      logger.error('auth_google_callback_no_access_token', new Error('No access token received'), {
        requestId,
        userId,
        tokensReceived: !!tokens,
      });
      return NextResponse.redirect(
        new URL("/home?error=no_access_token", request.url)
      );
    }

    logger.info('auth_google_callback_received_tokens', {
      requestId,
      userId,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });

    const user = await prisma.user.findUnique({
      where: {
        clerkId: userId,
      },
    });

    if (!user) {
      logger.warn('auth_google_callback_user_not_found', {
        requestId,
        userId,
      });
      return NextResponse.redirect(
        new URL("/home?error=user_not_found", request.url)
      );
    }

    logger.info('auth_google_callback_updating_user', {
      requestId,
      userId,
    });

    await prisma.user.update({
      where: {
        clerkId: userId,
      },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        calenderConnected: true,
        googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    const duration = performance.now() - startTime;
    logger.info('auth_google_callback_success', {
      requestId,
      userId,
      duration: Math.round(duration),
    });

    return NextResponse.redirect(
      new URL("/home?connected=direct", request.url)
    );

  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('auth_google_callback_unexpected_error', error, {
      requestId,
      duration: Math.round(duration),
    });

    return NextResponse.redirect(
      new URL("/home?error=callback_failed", request.url)
    );
  }
}

