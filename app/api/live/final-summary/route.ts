import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { processMeetingTranscript } from "@/lib/ai-processor";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/request-context";

type SummarySegment = {
  speaker?: string;
  text?: string;
  offset?: number;
  end?: number;
};

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = performance.now();

  try {
    logger.info("live_final_summary_request_received", {
      requestId,
      endpoint: "/api/live/final-summary",
      method: "POST",
    });

    const { userId } = await auth();
    if (!userId) {
      logger.warn("live_final_summary_not_authenticated", { requestId });
      return NextResponse.json(
        createErrorResponse(new AppError(ErrorMessages.NOT_AUTHENTICATED), requestId),
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.segments)) {
      const appError = new AppError(ErrorMessages.VALIDATION_FAILED("segments"));
      return NextResponse.json(createErrorResponse(appError, requestId), {
        status: appError.statusCode,
      });
    }

    const segments = (body.segments as SummarySegment[])
      .map((segment) => ({
        speaker: segment.speaker || "Speaker",
        text: typeof segment.text === "string" ? segment.text.trim() : "",
        offset: segment.offset,
        end: segment.end,
      }))
      .filter((segment) => segment.text.length > 0);

    const result = await processMeetingTranscript(segments);

    const duration = performance.now() - startTime;
    logger.info("live_final_summary_success", {
      requestId,
      userId,
      duration: Math.round(duration),
    });

    const res = NextResponse.json(result);
    res.headers.set("X-Request-Id", requestId);
    return res;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error("live_final_summary_unexpected_error", error, {
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
