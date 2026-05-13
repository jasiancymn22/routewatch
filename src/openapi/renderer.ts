import { OpenAPIDocument } from './builder';

export type OutputFormat = 'json' | 'yaml';

/**
 * Renders an OpenAPI document to a string in the specified format.
 * Uses a minimal YAML serializer to avoid external dependencies.
 */
export function renderDocument(doc: OpenAPIDocument, format: OutputFormat = 'json'): string {
  if (format === 'json') {
    return JSON.stringify(doc, null, 2);
  }
  return toYaml(doc, 0);
}

function toYaml(value: unknown, indent: number): string {
  const pad = '  '.repeat(indent);

  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (/[:\[\]{}#&*!|>'",%@`\n]/.test(value) || value.trim() !== value) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value
      .map((item) => `${pad}- ${toYaml(item, indent + 1).trimStart()}`)
      .join('\n');
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    return entries
      .map(([k, v]) => {
        const rendered = toYaml(v, indent + 1);
        const isBlock = rendered.includes('\n');
        return isBlock ? `${pad}${k}:\n${rendered}` : `${pad}${k}: ${rendered}`;
      })
      .join('\n');
  }

  return String(value);
}
