import { TrafficEntry } from './types';

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function paginateEntries(
  entries: TrafficEntry[],
  options: PaginationOptions
): PaginatedResult<TrafficEntry> {
  const { page, pageSize } = options;

  if (page < 1) throw new RangeError('page must be >= 1');
  if (pageSize < 1) throw new RangeError('pageSize must be >= 1');

  const total = entries.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = entries.slice(start, start + pageSize);

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}

export function paginateByRoute(
  entries: TrafficEntry[],
  route: string,
  options: PaginationOptions
): PaginatedResult<TrafficEntry> {
  const filtered = entries.filter((e) => e.path === route);
  return paginateEntries(filtered, options);
}

export function getPage<T>(
  items: T[],
  page: number,
  pageSize: number
): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
