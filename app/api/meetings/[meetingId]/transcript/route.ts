import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/request-context";
import { processMeetingTranscript } from "@/lib/ai-processor";

type TranscriptSegment = {
  id?: number;
  speaker?: string;
  offset?: number;
  end?: number;
  text?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  const requestId = generateRequestId();
  const startTime = performance.now();

  try {
    logger.info("meeting_transcript_update_request_received", {
      requestId,
      endpoint: "/api/meetings/[meetingId]/transcript",
      method: "POST",
    });

    const { userId } = await auth();

    if (!userId) {
      logger.warn("meeting_transcript_not_authenticated", { requestId });
      return NextResponse.json(
        createErrorResponse(new AppError(ErrorMessages.NOT_AUTHENTICATED), requestId),
        { status: 401 }
      );
    }

    const { meetingId } = params;
    const body = await request.json().catch(() => null);

    if (!body || !Array.isArray(body.segments)) {
      const appError = new AppError(ErrorMessages.VALIDATION_FAILED("segments"));
      return NextResponse.json(createErrorResponse(appError, requestId), {
        status: appError.statusCode,
      });
    }

    const segments = (body.segments as TranscriptSegment[])
      .filter((segment) => segment && typeof segment.text === "string")
      .map((segment) => ({
        id:
          typeof segment.id === "number" && Number.isFinite(segment.id)
            ? segment.id
            : undefined,
        speaker: typeof segment.speaker === "string" ? segment.speaker : "Speaker 1",
        offset:
          typeof segment.offset === "number" && Number.isFinite(segment.offset)
            ? segment.offset
            : 0,
        end:
          typeof segment.end === "number" && Number.isFinite(segment.end)
            ? segment.end
            : undefined,
        text: (segment.text || "").trim(),
      }))
      .filter((segment) => segment.text.length > 0);

    const startedAt = typeof body.startedAt === "string" ? body.startedAt : undefined;
    const endedAt = typeof body.endedAt === "string" ? body.endedAt : undefined;
    const summarize = body.summarize === true;

    logger.info("meeting_transcript_lookup", {
      requestId,
      meetingId,
      userId,
      segmentCount: segments.length,
    });

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { user: true },
    });

    if (!meeting) {
      logger.warn("meeting_transcript_not_found", { requestId, meetingId });
      return NextResponse.json(
        createErrorResponse(new AppError(ErrorMessages.MEETING_NOT_FOUND), requestId),
        { status: 404 }
      );
    }

    if (meeting.user?.clerkId !== userId) {
      logger.warn("meeting_transcript_unauthorized", {
        requestId,
        meetingId,
        userId,
        ownerId: meeting.user?.clerkId,
      });
      return NextResponse.json(
        createErrorResponse(new AppError(ErrorMessages.UNAUTHORIZED), requestId),
        { status: 403 }
      );
    }

    const transcriptPayload: Record<string, unknown> = {
      segments,
    };
    if (startedAt) {
      transcriptPayload.startedAt = startedAt;
    }
    if (endedAt) {
      transcriptPayload.endedAt = endedAt;
    }

    let summaryResult: { summary: string; actionItems: Array<{ id: number; text: string }> } | null =
      null;

    if (summarize) {
      summaryResult = await processMeetingTranscript(segments);
    }

    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        transcript: transcriptPayload,
        transcriptReady: true,
        meetingEnded: true,
        summary: summaryResult?.summary || meeting.summary,
        actionItems: summaryResult?.actionItems || meeting.actionItems,
        processed: summarize ? true : meeting.processed,
        processedAt: summarize ? new Date() : meeting.processedAt,
      },
    });

    const duration = performance.now() - startTime;
    logger.info("meeting_transcript_update_success", {
      requestId,
      meetingId,
      userId,
      duration: Math.round(duration),
    });

    const res = NextResponse.json({
      success: true,
      meetingId,
      transcriptReady: updated.transcriptReady,
      summary: summaryResult?.summary,
      actionItems: summaryResult?.actionItems,
    });
    res.headers.set("X-Request-Id", requestId);
    return res;
  } catch (error) {
    const duration = performance.now() - startTime;

    if (error instanceof AppError) {
      logger.error("meeting_transcript_app_error", error, {
        requestId,
        duration: Math.round(duration),
        errorCode: error.code,
      });
      const res = NextResponse.json(createErrorResponse(error, requestId), {
        status: error.statusCode,
      });
      res.headers.set("X-Request-Id", requestId);
      return res;
    }

    logger.error("meeting_transcript_unexpected_error", error, {
      requestId,
      duration: Math.round(duration),
    });

    const appError = new AppError(ErrorMessages.DATABASE_ERROR);
    const res = NextResponse.json(createErrorResponse(appError, requestId), {
      status: appError.statusCode,
    });
    res.headers.set("X-Request-Id", requestId);
    return res;
  }
}
