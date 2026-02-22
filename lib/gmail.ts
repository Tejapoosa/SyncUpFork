import { prisma } from "./db";

/**
 * Get valid Gmail access token for a user (handles refresh if needed)
 */
export async function getGmailAccessToken(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            gmailAccessToken: true,
            gmailRefreshToken: true,
            gmailTokenExpiry: true,
            gmailConnected: true,
        },
    });

    if (!user || !user.gmailConnected || !user.gmailAccessToken) {
        return null;
    }

    // Check if token is expired
    const now = new Date();
    if (user.gmailTokenExpiry && user.gmailTokenExpiry < now) {
        // Token expired, refresh it
        if (!user.gmailRefreshToken) {
            return null;
        }

        try {
            const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    client_id: process.env.GOOGLE_CLIENT_ID!,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                    refresh_token: user.gmailRefreshToken,
                    grant_type: "refresh_token",
                }),
            });

            if (!tokenResponse.ok) {
                console.error("Failed to refresh Gmail token");
                return null;
            }

            const tokens = await tokenResponse.json();

            // Update tokens in database
            await prisma.user.update({
                where: { id: userId },
                data: {
                    gmailAccessToken: tokens.access_token,
                    gmailTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
                },
            });

            return tokens.access_token;
        } catch (error) {
            console.error("Error refreshing Gmail token:", error);
            return null;
        }
    }

    return user.gmailAccessToken;
}

/**
 * Fetch emails from Gmail API
 */
export async function fetchGmailEmails(
    accessToken: string,
    query: string = "newer_than:1d",
    maxResults: number = 10
): Promise<GmailMessage[]> {
    const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?${new URLSearchParams({
            q: query,
            maxResults: maxResults.toString(),
        })}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error(`Gmail API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.messages || [];
}

/**
 * Get full email details
 */
export async function getGmailMessage(accessToken: string, messageId: string): Promise<GmailMessageDetail | null> {
    const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?${new URLSearchParams({
            format: "full",
        })}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        return null;
    }

    return response.json();
}

/**
 * Parse email headers
 */
export function parseEmailHeaders(headers: { name: string; value: string }[]): {
    from: string;
    fromEmail: string;
    to: string;
    subject: string;
    date: string;
} {
    const getHeader = (name: string) => {
        const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
        return header?.value || "";
    };

    const from = getHeader("From");
    const fromEmail = extractEmail(from);
    const to = getHeader("To");
    const subject = getHeader("Subject");
    const date = getHeader("Date");

    return { from, fromEmail, to, subject, date };
}

/**
 * Extract email address from "Name <email@example.com>" format
 */
export function extractEmail(fromHeader: string): string {
    const match = fromHeader.match(/<([^>]+)>/);
    if (match) {
        return match[1];
    }
    // If no angle brackets, assume it's already an email
    return fromHeader.trim();
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string {
    const parts = email.split("@");
    return parts.length > 1 ? parts[1].toLowerCase() : "";
}

/**
 * Get email body from payload
 */
export function getEmailBody(payload: any): { text: string; html: string } {
    let text = "";
    let html = "";

    if (payload.body?.data) {
        // Simple body
        const decoded = Buffer.from(payload.body.data, "base64").toString("utf-8");
        if (payload.mimeType === "text/plain") {
            text = decoded;
        } else if (payload.mimeType === "text/html") {
            html = decoded;
        }
    }

    // Handle multipart
    if (payload.parts) {
        for (const part of payload.parts) {
            if (part.mimeType === "text/plain" && part.body?.data) {
                text = Buffer.from(part.body.data, "base64").toString("utf-8");
            } else if (part.mimeType === "text/html" && part.body?.data) {
                html = Buffer.from(part.body.data, "base64").toString("utf-8");
            }
            // Check nested parts
            if (part.parts) {
                for (const nested of part.parts) {
                    if (nested.mimeType === "text/plain" && nested.body?.data) {
                        text = Buffer.from(nested.body.data, "base64").toString("utf-8");
                    } else if (nested.mimeType === "text/html" && nested.body?.data) {
                        html = Buffer.from(nested.body.data, "base64").toString("utf-8");
                    }
                }
            }
        }
    }

    return { text, html };
}

// Type definitions
export interface GmailMessage {
    id: string;
    threadId: string;
}

export interface GmailMessageDetail {
    id: string;
    threadId: string;
    payload: {
        headers: { name: string; value: string }[];
        body?: { data?: string };
        mimeType: string;
        parts?: any[];
    };
    snippet: string;
}
