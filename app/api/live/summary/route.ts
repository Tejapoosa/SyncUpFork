import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { chatWithAI } from "@/lib/openai";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/request-context";

type SummarySegment = {
  speaker?: string;
  text?: string;
};

function extractJsonBlock(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = performance.now();

  try {
    logger.info("live_summary_request_received", {
      requestId,
      endpoint: "/api/live/summary",
      method: "POST",
    });

    const { userId } = await auth();
    if (!userId) {
      logger.warn("live_summary_not_authenticated", { requestId });
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
      }))
      .filter((segment) => segment.text.length > 0)
      .slice(-40);

    if (segments.length === 0) {
      return NextResponse.json({
        topic: "",
        summary: "",
        bullets: [],
      });
    }

    const transcriptText = segments
      .map((segment) => `${segment.speaker}: ${segment.text}`)
      .join("\n");

    const systemPrompt = `You are a meeting assistant. Summarize the current discussion in a concise way.
Return JSON only with the following fields:
{
  "topic": "2-4 word topic",
  "summary": "1-2 sentence summary",
  "bullets": ["Key point 1", "Key point 2", "Key point 3"]
}
Keep bullets short.`;

    const userPrompt = `Transcript excerpt:\n${transcriptText}\n\nReturn JSON only.`;

    const response = await chatWithAI(systemPrompt, userPrompt);
    let parsed: any = null;
    try {
      parsed = JSON.parse(response);
    } catch {
      parsed = extractJsonBlock(response);
    }

    const result = {
      topic: parsed?.topic || "",
      summary: parsed?.summary || response || "",
      bullets: Array.isArray(parsed?.bullets) ? parsed.bullets : [],
    };

    const duration = performance.now() - startTime;
    logger.info("live_summary_success", {
      requestId,
      userId,
      duration: Math.round(duration),
    });

    const res = NextResponse.json(result);
    res.headers.set("X-Request-Id", requestId);
    return res;
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error("live_summary_unexpected_error", error, {
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
