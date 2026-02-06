export type LiveSegment = {
  id?: number;
  sessionId?: string;
  speaker: string;
  offset: number;
  end?: number;
  text: string;
};

export type StoredTranscript = {
  meetingId: string;
  meetingTitle?: string;
  startedAt: string;
  updatedAt: string;
  segments: LiveSegment[];
};

const STORAGE_PREFIX = "liveTranscript:";
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_SEGMENTS = 500;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function storageKey(meetingId: string) {
  return `${STORAGE_PREFIX}${meetingId}`;
}

export function loadTranscript(meetingId: string): StoredTranscript | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(meetingId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTranscript;
    if (!parsed || !Array.isArray(parsed.segments)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearTranscript(meetingId: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(storageKey(meetingId));
  } catch {}
}

export function saveTranscript(
  meetingId: string,
  payload: Omit<StoredTranscript, "updatedAt">
): { trimmed: boolean } {
  if (!isBrowser()) return { trimmed: false };
  let trimmed = false;
  const updatedAt = new Date().toISOString();
  let segments = payload.segments;

  const buildData = (segmentsToSave: LiveSegment[]) => ({
    ...payload,
    segments: segmentsToSave,
    updatedAt,
  });

  try {
    let data = buildData(segments);
    let serialized = JSON.stringify(data);
    if (serialized.length > MAX_BYTES) {
      trimmed = true;
      segments = segments.slice(-MAX_SEGMENTS);
      data = buildData(segments);
      serialized = JSON.stringify(data);
    }
    if (serialized.length > MAX_BYTES) {
      trimmed = true;
      const fallbackSize = Math.max(50, Math.floor(MAX_SEGMENTS / 2));
      segments = segments.slice(-fallbackSize);
      data = buildData(segments);
      serialized = JSON.stringify(data);
    }
    window.localStorage.setItem(storageKey(meetingId), serialized);
    return { trimmed };
  } catch {
    return { trimmed };
  }
}
