import http from 'http';
import { getTrafficSnapshot } from '../traffic/recorder';
import { inferFromTrafficEntries } from '../schema/inferrer';
import { buildOpenAPIDocument } from '../openapi/builder';
import { renderDocument, toYaml } from '../openapi/renderer';
import type { OpenAPIInfo } from '../openapi/builder';

export interface ServeOptions {
  port: number;
  format: 'json' | 'yaml';
  info?: Partial<OpenAPIInfo>;
}

const defaultInfo: OpenAPIInfo = {
  title: 'RouteWatch API',
  version: '1.0.0',
  description: 'Auto-generated from runtime traffic analysis',
};

export function createDocsServer(options: ServeOptions): http.Server {
  const { port, format, info } = options;

  const server = http.createServer((req, res) => {
    if (req.url !== '/openapi.json' && req.url !== '/openapi.yaml') {
      res.writeHead(302, { Location: format === 'yaml' ? '/openapi.yaml' : '/openapi.json' });
      res.end();
      return;
    }

    const snapshot = getTrafficSnapshot();
    const schemas = inferFromTrafficEntries(snapshot);
    const doc = buildOpenAPIDocument(snapshot, schemas, { ...defaultInfo, ...info });

    if (format === 'yaml' || req.url === '/openapi.yaml') {
      res.writeHead(200, { 'Content-Type': 'application/x-yaml' });
      res.end(toYaml(doc));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(renderDocument(doc));
    }
  });

  server.listen(port, () => {
    console.log(`[routewatch] Docs server running at http://localhost:${port}`);
    console.log(`[routewatch] OpenAPI spec available at http://localhost:${port}/openapi.${format}`);
  });

  return server;
}
