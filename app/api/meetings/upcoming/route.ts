import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { syncCalendarEventsToDatabase } from "@/lib/integrations/google/calendar"
import { logger } from "@/lib/logger"
import { AppError, ErrorMessages, createErrorResponse } from "@/lib/errors"
import { generateRequestId } from "@/lib/request-context"

export async function GET(request: NextRequest) {
    const requestId = generateRequestId()
    const startTime = performance.now()

    try {
        logger.info('meetings_upcoming_request_received', {
            requestId,
            endpoint: '/api/meetings/upcoming',
            method: 'GET',
        })

        const { userId } = await auth()
        if (!userId) {
            logger.warn('meetings_upcoming_not_authenticated', { requestId })
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.NOT_AUTHENTICATED),
                    requestId
                ),
                { status: 401 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { clerkId: userId }
        })

        if (!user) {
            logger.warn('meetings_upcoming_user_not_found', { requestId, userId })
            return NextResponse.json(
                createErrorResponse(
                    new AppError(ErrorMessages.USER_NOT_FOUND),
                    requestId
                ),
                { status: 404 }
            )
        }

        logger.info('meetings_upcoming_lookup', {
            requestId,
            userId,
            calendarConnected: user.calenderConnected,
        })

        const now = new Date()
        let upcomingMeetings = await prisma.meeting.findMany({
            where: {
                userId: user.id,
                startTime: { gte: now },
                isFromCalendar: true
            },
            orderBy: { startTime: 'asc' },
            take: 10
        })

        // If user is connected but no upcoming meetings, try to sync from calendar
        if (user.calenderConnected && user.googleAccessToken && upcomingMeetings.length === 0) {
            try {
                logger.info('meetings_upcoming_syncing_calendar', {
                    requestId,
                    userId,
                })
                await syncCalendarEventsToDatabase(userId)

                // Fetch meetings again after sync
                upcomingMeetings = await prisma.meeting.findMany({
                    where: {
                        userId: user.id,
                        startTime: { gte: now },
                        isFromCalendar: true
                    },
                    orderBy: { startTime: 'asc' },
                    take: 10
                })
                logger.info('meetings_upcoming_sync_complete', {
                    requestId,
                    userId,
                    foundMeetings: upcomingMeetings.length,
                })
            } catch (syncError) {
                logger.error('meetings_upcoming_sync_failed', syncError, {
                    requestId,
                    userId,
                })
                // Continue with empty results if sync fails
            }
        }

        const events = upcomingMeetings.map(meeting => ({
            id: meeting.calendarEventId || meeting.id,
            summary: meeting.title,
            start: { dateTime: meeting.startTime.toISOString() },
            end: { dateTime: meeting.endTime.toISOString() },
            attendees: meeting.attendees ? JSON.parse(meeting.attendees as string) : [],
            hangoutLink: meeting.meetingUrl,
            conferenceData: meeting.meetingUrl ? { entryPoints: [{ uri: meeting.meetingUrl }] } : null,
            botScheduled: meeting.botScheduled,
            meetingId: meeting.id
        }))

        const duration = performance.now() - startTime
        logger.info('meetings_upcoming_success', {
            requestId,
            userId,
            count: events.length,
            duration: Math.round(duration),
        })

        const res = NextResponse.json({
            events,
            connected: user.calenderConnected,
            source: 'database',
            count: events.length
        })
        res.headers.set('X-Request-Id', requestId)
        return res

    } catch (error) {
        const duration = performance.now() - startTime
        logger.error('meetings_upcoming_unexpected_error', error, {
            requestId,
            duration: Math.round(duration),
        })

        const appError = new AppError(ErrorMessages.DATABASE_ERROR)
        const res = NextResponse.json(
            createErrorResponse(appError, requestId),
            { status: appError.statusCode }
        )
        res.headers.set('X-Request-Id', requestId)
        return res
    }
}
