import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/request-context";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = performance.now();

  try {
    logger.info('admin_fix_audio_urls_request_received', {
      requestId,
      endpoint: '/api/admin/fix-audio-urls',
      method: 'POST',
    });

    const { userId } = await auth();

    if (!userId) {
      logger.warn('admin_fix_audio_urls_not_authenticated', { requestId });
      return NextResponse.json(
        createErrorResponse(
          new AppError(ErrorMessages.NOT_AUTHENTICATED),
          requestId
        ),
        { status: 401 }
      );
    }

    logger.info('admin_fix_audio_urls_lookup', {
      requestId,
      userId,
    });

    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      logger.warn('admin_fix_audio_urls_user_not_found', {
        requestId,
        userId,
      });
      return NextResponse.json(
        createErrorResponse(
          new AppError(ErrorMessages.USER_NOT_FOUND),
          requestId
        ),
        { status: 404 }
      );
    }

    logger.info('admin_fix_audio_urls_scanning_meetings', {
      requestId,
      userId: user.id,
    });

    const meetingsToUpdate = await prisma.meeting.findMany({
      where: {
        userId: user.id,
        recordingUrl: "https://meetingbot1.s3.eu-north-1.amazonaws.com/test-audio.mp3"
      }
    });

    logger.info('admin_fix_audio_urls_found_meetings', {
      requestId,
      count: meetingsToUpdate.length,
    });

    const updatedMeetings = [];
    for (const meeting of meetingsToUpdate) {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          recordingUrl: "/test-audio.mp3"
        }
      });

      updatedMeetings.push({
        id: meeting.id,
        title: meeting.title
      });

      logger.info('admin_fix_audio_urls_updated_meeting', {
        requestId,
        meetingId: meeting.id,
        title: meeting.title,
      });
    }

    const duration = performance.now() - startTime;
    logger.info('admin_fix_audio_urls_success', {
      requestId,
      userId: user.id,
      updatedCount: updatedMeetings.length,
      duration: Math.round(duration),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedMeetings.length} meetings to use local audio file`,
      updatedMeetings
    });

  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error('admin_fix_audio_urls_unexpected_error', error, {
      requestId,
      duration: Math.round(duration),
    });

    const appError = new AppError(ErrorMessages.DATABASE_ERROR);
    return NextResponse.json(
      createErrorResponse(appError, requestId),
      { status: appError.statusCode }
    );
  }
}
