import http from 'http';
import { createDocsServer } from './serve';
import * as recorder from '../traffic/recorder';
import * as inferrer from '../schema/inferrer';
import * as builder from '../openapi/builder';
import * as renderer from '../openapi/renderer';

jest.mock('../traffic/recorder');
jest.mock('../schema/inferrer');
jest.mock('../openapi/builder');
jest.mock('../openapi/renderer');

const mockSnapshot = [{ method: 'GET', path: '/users', statusCode: 200, requestBody: null, responseBody: { id: 1 }, queryParams: {} }];
const mockDoc = { openapi: '3.0.0', info: { title: 'Test', version: '1.0.0' }, paths: {} };

beforeEach(() => {
  jest.resetAllMocks();
  (recorder.getTrafficSnapshot as jest.Mock).mockReturnValue(mockSnapshot);
  (inferrer.inferFromTrafficEntries as jest.Mock).mockReturnValue({});
  (builder.buildOpenAPIDocument as jest.Mock).mockReturnValue(mockDoc);
  (renderer.renderDocument as jest.Mock).mockReturnValue(JSON.stringify(mockDoc));
  (renderer.toYaml as jest.Mock).mockReturnValue('openapi: 3.0.0');
});

function getJson(port: number, path: string): Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}${path}`, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body, headers: res.headers }));
    }).on('error', reject);
  });
}

describe('createDocsServer', () => {
  let server: http.Server;

  afterEach((done) => server?.close(done));

  it('serves JSON at /openapi.json', (done) => {
    server = createDocsServer({ port: 14040, format: 'json' });
    server.once('listening', async () => {
      const res = await getJson(14040, '/openapi.json');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(renderer.renderDocument).toHaveBeenCalledWith(mockDoc);
      done();
    });
  });

  it('serves YAML at /openapi.yaml', (done) => {
    server = createDocsServer({ port: 14041, format: 'yaml' });
    server.once('listening', async () => {
      const res = await getJson(14041, '/openapi.yaml');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/x-yaml');
      expect(renderer.toYaml).toHaveBeenCalledWith(mockDoc);
      done();
    });
  });

  it('redirects root to default format', (done) => {
    server = createDocsServer({ port: 14042, format: 'json' });
    server.once('listening', async () => {
      const res = await getJson(14042, '/');
      expect(res.status).toBe(302);
      done();
    });
  });

  it('returns 404 for unknown paths', (done) => {
    server = createDocsServer({ port: 14043, format: 'json' });
    server.once('listening', async () => {
      const res = await getJson(14043, '/unknown-route');
      expect(res.status).toBe(404);
      done();
    });
  });
});
