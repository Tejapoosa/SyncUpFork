import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/request-context";

export async function GET(request: NextRequest) {
    const requestId = generateRequestId();

    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
            logger.warn("gmail_callback_error", { requestId, error });
            return NextResponse.redirect(new URL("/home?error=gmail_auth_failed", request.url));
        }

        if (!code || !state) {
            logger.warn("gmail_callback_missing_params", { requestId });
            return NextResponse.redirect(new URL("/home?error=gmail_auth_failed", request.url));
        }

        // Decode state to get user ID
        let stateData: { userId: string; requestId: string };
        try {
            stateData = JSON.parse(Buffer.from(state, "base64").toString());
        } catch {
            logger.error("gmail_callback_invalid_state", { requestId, state });
            return NextResponse.redirect(new URL("/home?error=gmail_auth_failed", request.url));
        }

        const { userId } = stateData;

        // Exchange code for tokens
        const tokenUrl = "https://oauth2.googleapis.com/token";
        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`;

        const tokenResponse = await fetch(tokenUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            logger.error("gmail_token_exchange_failed", { requestId, error: errorData });
            return NextResponse.redirect(new URL("/home?error=gmail_token_failed", request.url));
        }

        const tokens = await tokenResponse.json();

        // Save tokens to user
        await prisma.user.update({
            where: { id: userId },
            data: {
                gmailConnected: true,
                gmailAccessToken: tokens.access_token,
                gmailRefreshToken: tokens.refresh_token,
                gmailTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
            },
        });

        logger.info("gmail_callback_success", { requestId, userId });

        return NextResponse.redirect(new URL("/home?success=gmail_connected", request.url));

    } catch (error) {
        logger.error("gmail_callback_unexpected_error", error, { requestId });
        return NextResponse.redirect(new URL("/home?error=gmail_auth_failed", request.url));
    }
}

