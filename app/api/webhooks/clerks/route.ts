import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/request-context";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = performance.now();

  try {
    logger.info('webhook_clerk_request_received', {
      requestId,
      endpoint: '/api/webhooks/clerks',
      method: 'POST',
    });

    const payload = await request.text();
    const headers = {
      "svix-id": request.headers.get("svix-id") || "",
      "svix-timestamp": request.headers.get("svix-timestamp") || "",
      "svix-signature": request.headers.get("svix-signature") || "",
    };

    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (webhookSecret) {
      const wh = new Webhook(webhookSecret);
      try {
        wh.verify(payload, headers);
      } catch (err) {
        logger.warn('webhook_clerk_invalid_signature', {
          requestId,
        });
        return NextResponse.json(
          { error: "Invalid Signature" },
          { status: 400 }
        );
      }
    }

    const event = JSON.parse(payload);

    logger.info('webhook_clerk_event_received', {
      requestId,
      eventType: event.type,
    });

    if (event.type === "user.created") {
      const { id, email_addresses, first_name, last_name } = event.data;
      const primaryEmail = email_addresses?.find(
        (email: any) => email.id === event.data.primary_email_address_id
      )?.email_address;

      logger.info('webhook_clerk_creating_user', {
        requestId,
        clerkId: id,
        email: primaryEmail,
      });

      const newUser = await prisma.user.create({
        data: {
          id: id,
          clerkId: id,
          email: primaryEmail || null,
          name: `${first_name} ${last_name}`,
        },
      });

      const duration = performance.now() - startTime;
      logger.info('webhook_clerk_user_created', {
        requestId,
        userId: newUser.id,
        email: newUser.email,
        duration: Math.round(duration),
      });

      return NextResponse.json({ message: "user created successfully" });
    }

    logger.info('webhook_clerk_no_action_needed', {
      requestId,
      eventType: event.type,
    });

    return NextResponse.json({ message: "webhook received" });

  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('webhook_clerk_unexpected_error', error, {
      requestId,
      duration: Math.round(duration),
    });

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
