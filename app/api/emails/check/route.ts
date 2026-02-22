import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/request-context";
import {
    getGmailAccessToken,
    fetchGmailEmails,
    getGmailMessage,
    parseEmailHeaders,
    getEmailBody,
    extractDomain,
} from "@/lib/gmail";
import { processEmailWithAI } from "@/lib/email-processor";

export async function POST(request: NextRequest) {
    const requestId = generateRequestId();

    try {
        const { userId: clerkUserId } = await auth();

        if (!clerkUserId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!user.gmailConnected) {
            return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
        }

        const accessToken = await getGmailAccessToken(user.id);
        if (!accessToken) {
            return NextResponse.json({ error: "Token expired" }, { status: 401 });
        }

        // Fetch all recent emails - no domain filter for debugging
        const messages = await fetchGmailEmails(accessToken, "newer_than:30d", 30);

        logger.info("gmail_messages_found", { requestId, count: messages.length });

        const processedEmails = [];

        for (const message of messages) {
            try {
                // Check if already exists
                const existingEmail = await prisma.email.findUnique({
                    where: { gmailId: message.id },
                });

                if (existingEmail) {
                    processedEmails.push(existingEmail);
                    continue;
                }

                const emailDetail = await getGmailMessage(accessToken, message.id);
                if (!emailDetail) continue;

                const headers = emailDetail.payload.headers;
                const { from, fromEmail, to, subject, date } = parseEmailHeaders(headers);
                const domain = extractDomain(fromEmail).toLowerCase();
                const { text: bodyText } = getEmailBody(emailDetail.payload);
                const snippet = emailDetail.snippet || "";

                const email = await prisma.email.create({
                    data: {
                        gmailId: message.id,
                        threadId: message.threadId,
                        subject,
                        fromName: from.replace(`<${fromEmail}>`, "").trim(),
                        fromEmail,
                        toEmail: to,
                        snippet,
                        body: bodyText || snippet,
                        receivedAt: new Date(date) || new Date(),
                        domain,
                        isRead: false,
                        userId: user.id,
                    },
                });

                // Generate AI summary
                try {
                    const aiResult = await processEmailWithAI({
                        subject,
                        from: from,
                        body: bodyText || snippet,
                    });

                    const updatedEmail = await prisma.email.update({
                        where: { id: email.id },
                        data: {
                            summary: aiResult.summary,
                            actionItems: aiResult.actionItems,
                            summarizedAt: new Date(),
                        },
                    });
                    processedEmails.push(updatedEmail);
                } catch {
                    processedEmails.push(email);
                }
            } catch (error) {
                logger.error("email_processing_error", error, { requestId, messageId: message.id });
            }
        }

        return NextResponse.json({
            success: true,
            processed: processedEmails.length,
            emails: processedEmails,
        });

    } catch (error) {
        logger.error("check_emails_error", error, { requestId });
        return NextResponse.json({ error: "Failed to check emails" }, { status: 500 });
    }
}
