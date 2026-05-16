import { OpenAPIObject, PathItemObject } from 'openapi3-ts';
import { TrafficEntry } from '../traffic/types';
import {
  groupEntriesBySessions,
  getTopSessions,
  getErrorProneSessions,
  SessionGroup,
} from '../traffic/session';

export interface SessionExtension {
  'x-session-stats': {
    totalSessions: number;
    avgRoutesPerSession: number;
    avgDurationMs: number;
    errorProneSessions: number;
    topSessions: Array<{
      sessionId: string;
      routeCount: number;
      durationMs: number;
      errorCount: number;
    }>;
  };
}

export function buildSessionExtension(
  entries: TrafficEntry[]
): SessionExtension['x-session-stats'] {
  const sessions = groupEntriesBySessions(entries);
  const all = Array.from(sessions.values());

  const totalSessions = all.length;
  const avgRoutesPerSession =
    totalSessions > 0
      ? Math.round(all.reduce((s, g) => s + g.routeCount, 0) / totalSessions)
      : 0;
  const avgDurationMs =
    totalSessions > 0
      ? Math.round(all.reduce((s, g) => s + g.durationMs, 0) / totalSessions)
      : 0;
  const errorProneSessions = getErrorProneSessions(sessions, 0.5).length;
  const topSessions = getTopSessions(sessions, 5).map((g: SessionGroup) => ({
    sessionId: g.sessionId,
    routeCount: g.routeCount,
    durationMs: g.durationMs,
    errorCount: g.errorCount,
  }));

  return {
    totalSessions,
    avgRoutesPerSession,
    avgDurationMs,
    errorProneSessions,
    topSessions,
  };
}

export function applySessionsToDocument(
  doc: OpenAPIObject,
  entries: TrafficEntry[]
): OpenAPIObject {
  const sessionStats = buildSessionExtension(entries);
  return {
    ...doc,
    info: {
      ...doc.info,
      'x-session-stats': sessionStats,
    },
  } as OpenAPIObject;
}
