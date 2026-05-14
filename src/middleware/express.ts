import { Request, Response, NextFunction } from 'express';
import { recordRequest } from '../traffic/recorder';
import { TrafficStore } from '../traffic/types';

export interface RouteWatchOptions {
  ignore?: string[];
  captureBody?: boolean;
  captureHeaders?: string[];
}

export function createExpressMiddleware(
  store: TrafficStore,
  options: RouteWatchOptions = {}
) {
  const {
    ignore = ['/health', '/metrics', '/favicon.ico'],
    captureBody = true,
    captureHeaders = ['content-type', 'accept'],
  } = options;

  return function routeWatchMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const startTime = Date.now();

    const originalJson = res.json.bind(res);
    let responseBody: unknown;

    res.json = function (body: unknown) {
      responseBody = body;
      return originalJson(body);
    };

    res.on('finish', () => {
      const requestHeaders: Record<string, string> = {};
      for (const header of captureHeaders) {
        const value = req.headers[header];
        if (value) {
          requestHeaders[header] = Array.isArray(value) ? value[0] : value;
        }
      }

      recordRequest(store, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        requestBody: captureBody ? req.body : undefined,
        responseBody: captureBody ? responseBody : undefined,
        queryParams: req.query as Record<string, string>,
        requestHeaders,
        timestamp: startTime,
      });
    });

    next();
  };
}
