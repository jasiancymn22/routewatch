import * as fs from 'fs';
import * as path from 'path';
import { renderDocument, toYaml } from '../openapi/renderer';
import { buildOpenAPIDocument } from '../openapi/builder';
import { getTrafficSnapshot } from '../traffic/recorder';
import { TrafficStore } from '../traffic/types';
import { OpenAPIObject } from '../openapi/builder';

export type ExportFormat = 'json' | 'yaml';

export interface ExportOptions {
  format: ExportFormat;
  outputPath: string;
  title?: string;
  version?: string;
  serverUrl?: string;
}

export function exportSnapshot(
  store: TrafficStore,
  options: ExportOptions
): void {
  const snapshot = getTrafficSnapshot(store);
  const doc = buildOpenAPIDocument(snapshot, {
    title: options.title ?? 'API Documentation',
    version: options.version ?? '1.0.0',
    serverUrl: options.serverUrl ?? 'http://localhost',
  });

  const content = serializeDocument(doc, options.format);
  const dir = path.dirname(options.outputPath);

  if (dir && dir !== '.') {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(options.outputPath, content, 'utf-8');
}

export function serializeDocument(
  doc: OpenAPIObject,
  format: ExportFormat
): string {
  if (format === 'yaml') {
    return toYaml(doc);
  }
  return renderDocument(doc);
}

export function resolveOutputPath(
  outputPath: string,
  format: ExportFormat
): string {
  const ext = format === 'yaml' ? '.yaml' : '.json';
  if (outputPath.endsWith('.json') || outputPath.endsWith('.yaml') || outputPath.endsWith('.yml')) {
    return outputPath;
  }
  return outputPath + ext;
}
