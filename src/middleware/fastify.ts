import { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { recordRequest } from '../traffic/recorder';
import { TrafficStore } from '../traffic/types';
import { RouteWatchOptions } from './express';

export interface RouteWatchFastifyOptions extends RouteWatchOptions {
  store: TrafficStore;
}

const routeWatchPlugin: FastifyPluginCallback<RouteWatchFastifyOptions> = (
  fastify,
  options,
  done
) => {
  const {
    store,
    ignore = ['/health', '/metrics', '/favicon.ico'],
    captureBody = true,
    captureHeaders = ['content-type', 'accept'],
  } = options;

  fastify.addHook(
    'onResponse',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const path = request.routerPath ?? request.url.split('?')[0];

      const requestHeaders: Record<string, string> = {};
      for (const header of captureHeaders) {
        const value = request.headers[header];
        if (value) {
          requestHeaders[header] = Array.isArray(value) ? value[0] : value;
        }
      }

      recordRequest(store, {
        method: request.method,
        path,
        statusCode: reply.statusCode,
        requestBody: captureBody ? request.body : undefined,
        responseBody: captureBody ? (reply as any).payload : undefined,
        queryParams: request.query as Record<string, string>,
        requestHeaders,
        timestamp: Date.now(),
      });
    }
  );

  done();
};

export const routeWatchFastify = fp(routeWatchPlugin, {
  fastify: '4.x',
  name: 'routewatch',
});
