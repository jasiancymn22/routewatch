import { TrafficEntry } from './types';

export interface SessionGroup {
  sessionId: string;
  entries: TrafficEntry[];
  startTime: number;
  endTime: number;
  durationMs: number;
  routeCount: number;
  errorCount: number;
}

export function extractSessionId(entry: TrafficEntry): string {
  const headers = entry.requestHeaders ?? {};
  return (
    (headers['x-session-id'] as string) ??
    (headers['x-request-id'] as string) ??
    (headers['authorization'] as string)?.slice(-8) ??
    'unknown'
  );
}

export function groupEntriesBySessions(
  entries: TrafficEntry[]
): Map<string, SessionGroup> {
  const map = new Map<string, SessionGroup>();

  for (const entry of entries) {
    const sessionId = extractSessionId(entry);
    const existing = map.get(sessionId);
    const ts = entry.timestamp ?? 0;
    const isError = entry.statusCode >= 400;

    if (!existing) {
      map.set(sessionId, {
        sessionId,
        entries: [entry],
        startTime: ts,
        endTime: ts,
        durationMs: 0,
        routeCount: 1,
        errorCount: isError ? 1 : 0,
      });
    } else {
      existing.entries.push(entry);
      if (ts < existing.startTime) existing.startTime = ts;
      if (ts > existing.endTime) existing.endTime = ts;
      existing.durationMs = existing.endTime - existing.startTime;
      existing.routeCount += 1;
      if (isError) existing.errorCount += 1;
    }
  }

  return map;
}

export function getTopSessions(
  sessions: Map<string, SessionGroup>,
  limit = 10
): SessionGroup[] {
  return Array.from(sessions.values())
    .sort((a, b) => b.routeCount - a.routeCount)
    .slice(0, limit);
}

export function getErrorProneSessions(
  sessions: Map<string, SessionGroup>,
  threshold = 0.5
): SessionGroup[] {
  return Array.from(sessions.values()).filter(
    (s) => s.routeCount > 0 && s.errorCount / s.routeCount >= threshold
  );
}
