"use client";

import { useMeetings } from "@/app/home/hooks/useMeetings";
import dynamic from 'next/dynamic';

// Lazy load heavy meeting view component
const LiveMeetingView = dynamic(() => import("./components/LiveMeetingView"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>
});

function LiveMeetingPage() {
  const {
    upcomingEvents,
    connected,
    loading,
    error,
    refreshCalendar,
    fetchPastMeetings,
  } = useMeetings();

  return (
    <LiveMeetingView
      upcomingEvents={upcomingEvents}
      connected={connected}
      loading={loading}
      error={error}
      onRefreshCalendar={refreshCalendar}
      onMeetingSaved={fetchPastMeetings}
    />
  );
}

export default LiveMeetingPage;
