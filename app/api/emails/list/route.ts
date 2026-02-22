import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/request-context";

export async function GET(request: NextRequest) {
    const requestId = generateRequestId();

    try {
        const { userId: clerkUserId } = await auth();

        if (!clerkUserId) {
            logger.warn("emails_list_not_authenticated", { requestId });
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { clerkId: clerkUserId },
        });

        if (!user) {
            logger.warn("emails_list_user_not_found", { requestId, clerkUserId });
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Get query params
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = parseInt(searchParams.get("offset") || "0");
        const domain = searchParams.get("domain");

        // Build where clause
        const where: any = { userId: user.id };
        if (domain) {
            where.domain = domain;
        }

        // Get emails
        const emails = await prisma.email.findMany({
            where,
            orderBy: { receivedAt: "desc" },
            take: limit,
            skip: offset,
        });

        // Get total count
        const total = await prisma.email.count({ where });

        logger.info("emails_list_success", {
            requestId,
            userId: user.id,
            count: emails.length,
            total,
        });

        return NextResponse.json({
            emails,
            total,
            limit,
            offset,
        });

    } catch (error) {
        logger.error("emails_list_unexpected_error", error, { requestId });
        return NextResponse.json(
            { error: "Failed to list emails" },
            { status: 500 }
        );
    }
}
