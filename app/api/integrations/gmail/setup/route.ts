import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/request-context";

export async function POST(request: NextRequest) {
    const requestId = generateRequestId();

    try {
        const { userId: clerkUserId } = await auth();

        if (!clerkUserId) {
            logger.warn("gmail_setup_not_authenticated", { requestId });
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Find user - they should already exist if logged in
        const user = await prisma.user.findUnique({
            where: { clerkId: clerkUserId }
        });

        if (!user) {
            logger.warn("gmail_setup_user_not_found", { requestId, clerkUserId });
            return NextResponse.json(
                { error: "User profile not found. Please try signing out and signing in again." },
                { status: 404 }
            );
        }

        // Generate OAuth URL for Gmail
        const scopes = [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.modify"
        ].join(" ");

        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`;
        const state = Buffer.from(JSON.stringify({
            userId: user.id,
            requestId
        })).toString("base64");

        const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        oauthUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
        oauthUrl.searchParams.set("redirect_uri", redirectUri);
        oauthUrl.searchParams.set("response_type", "code");
        oauthUrl.searchParams.set("scope", scopes);
        oauthUrl.searchParams.set("access_type", "offline");
        oauthUrl.searchParams.set("prompt", "consent");
        oauthUrl.searchParams.set("state", state);

        logger.info("gmail_setup_redirect", {
            requestId,
            userId: user.id,
            oauthUrl: oauthUrl.toString()
        });

        return NextResponse.json({
            url: oauthUrl.toString(),
            success: true
        });

    } catch (error) {
        logger.error("gmail_setup_error", error, { requestId });
        return NextResponse.json(
            { error: "Failed to setup Gmail integration" },
            { status: 500 }
        );
    }
}
