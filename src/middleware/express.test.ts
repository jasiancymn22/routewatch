import { createExpressMiddleware } from './express';
import { createTrafficStore } from '../traffic/recorder';
import { Request, Response, NextFunction } from 'express';

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/users',
    headers: { 'content-type': 'application/json' },
    query: {},
    body: undefined,
    ...overrides,
  } as unknown as Request;
}

function makeRes(overrides: Partial<Response> = {}): Response {
  const listeners: Record<string, () => void> = {};
  const res = {
    statusCode: 200,
    json: jest.fn().mockReturnThis(),
    on: (event: string, cb: () => void) => { listeners[event] = cb; },
    emit: (event: string) => { listeners[event]?.(); },
    ...overrides,
  } as unknown as Response;
  return res;
}

describe('createExpressMiddleware', () => {
  it('records a request after response finishes', () => {
    const store = createTrafficStore();
    const middleware = createExpressMiddleware(store);
    const req = makeReq();
    const res = makeRes();
    const next: NextFunction = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();

    (res as any).emit('finish');

    const snapshot = store.entries;
    expect(snapshot.size).toBe(1);
    expect(snapshot.has('GET /users')).toBe(true);
  });

  it('ignores paths in the ignore list', () => {
    const store = createTrafficStore();
    const middleware = createExpressMiddleware(store, { ignore: ['/health'] });
    const req = makeReq({ path: '/health' } as Partial<Request>);
    const res = makeRes();
    const next: NextFunction = jest.fn();

    middleware(req, res, next);
    (res as any).emit('finish');

    expect(store.entries.size).toBe(0);
  });

  it('calls next regardless', () => {
    const store = createTrafficStore();
    const middleware = createExpressMiddleware(store);
    const next: NextFunction = jest.fn();
    middleware(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
