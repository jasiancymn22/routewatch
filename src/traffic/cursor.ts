import { TrafficEntry } from './types';

export interface CursorPage {
  items: TrafficEntry[];
  nextCursor: string | null;
  prevCursor: string | null;
  total: number;
}

function encodeCursor(timestamp: number, index: number): string {
  return Buffer.from(JSON.stringify({ timestamp, index })).toString('base64');
}

function decodeCursor(cursor: string): { timestamp: number; index: number } {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
  } catch {
    throw new Error('Invalid cursor');
  }
}

export function cursorPaginate(
  entries: TrafficEntry[],
  pageSize: number,
  cursor?: string
): CursorPage {
  if (pageSize < 1) throw new RangeError('pageSize must be >= 1');

  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const total = sorted.length;

  let startIndex = 0;
  if (cursor) {
    const decoded = decodeCursor(cursor);
    const found = sorted.findIndex(
      (e, i) => e.timestamp === decoded.timestamp && i === decoded.index
    );
    startIndex = found >= 0 ? found + 1 : 0;
  }

  const items = sorted.slice(startIndex, startIndex + pageSize);

  const nextCursor =
    startIndex + pageSize < total
      ? encodeCursor(
          sorted[startIndex + pageSize - 1].timestamp,
          startIndex + pageSize - 1
        )
      : null;

  const prevCursor =
    startIndex > 0
      ? encodeCursor(
          sorted[Math.max(0, startIndex - pageSize)].timestamp,
          Math.max(0, startIndex - pageSize)
        )
      : null;

  return { items, nextCursor, prevCursor, total };
}
