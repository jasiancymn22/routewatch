import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exportSnapshot, serializeDocument, resolveOutputPath } from './exporter';
import { createTrafficStore, recordRequest } from '../traffic/recorder';

function makeMockStore() {
  const store = createTrafficStore();
  recordRequest(store, {
    method: 'GET',
    path: '/users',
    query: { page: '1' },
    requestBody: null,
    responseBody: { id: 1, name: 'Alice' },
    statusCode: 200,
  });
  return store;
}

describe('serializeDocument', () => {
  const doc = { openapi: '3.0.0', info: { title: 'Test', version: '1.0.0' }, paths: {} } as any;

  it('returns JSON string for json format', () => {
    const result = serializeDocument(doc, 'json');
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result).openapi).toBe('3.0.0');
  });

  it('returns YAML string for yaml format', () => {
    const result = serializeDocument(doc, 'yaml');
    expect(result).toContain('openapi:');
    expect(result).not.toContain('{');
  });
});

describe('resolveOutputPath', () => {
  it('appends .json extension when missing', () => {
    expect(resolveOutputPath('output', 'json')).toBe('output.json');
  });

  it('appends .yaml extension when missing', () => {
    expect(resolveOutputPath('output', 'yaml')).toBe('output.yaml');
  });

  it('preserves existing .json extension', () => {
    expect(resolveOutputPath('output.json', 'json')).toBe('output.json');
  });

  it('preserves existing .yaml extension', () => {
    expect(resolveOutputPath('output.yaml', 'yaml')).toBe('output.yaml');
  });
});

describe('exportSnapshot', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routewatch-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes a JSON file to disk', () => {
    const store = makeMockStore();
    const outPath = path.join(tmpDir, 'openapi.json');
    exportSnapshot(store, { format: 'json', outputPath: outPath });
    const content = fs.readFileSync(outPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.openapi).toBe('3.0.0');
    expect(parsed.paths['/users']).toBeDefined();
  });

  it('writes a YAML file to disk', () => {
    const store = makeMockStore();
    const outPath = path.join(tmpDir, 'openapi.yaml');
    exportSnapshot(store, { format: 'yaml', outputPath: outPath });
    const content = fs.readFileSync(outPath, 'utf-8');
    expect(content).toContain('openapi:');
    expect(content).toContain('/users');
  });

  it('creates nested directories if needed', () => {
    const store = makeMockStore();
    const outPath = path.join(tmpDir, 'nested', 'deep', 'openapi.json');
    exportSnapshot(store, { format: 'json', outputPath: outPath });
    expect(fs.existsSync(outPath)).toBe(true);
  });
});
