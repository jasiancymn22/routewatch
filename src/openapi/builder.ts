import { TrafficEntry } from '../traffic/types';
import { inferFromTrafficEntries } from '../schema/inferrer';

export interface OpenAPIDocument {
  openapi: string;
  info: { title: string; version: string; description?: string };
  paths: Record<string, PathItem>;
}

export interface PathItem {
  [method: string]: OperationObject;
}

export interface OperationObject {
  summary?: string;
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: Record<string, ResponseObject>;
}

export interface ParameterObject {
  name: string;
  in: 'query' | 'path' | 'header';
  required?: boolean;
  schema: Record<string, unknown>;
}

export interface RequestBodyObject {
  required?: boolean;
  content: Record<string, { schema: Record<string, unknown> }>;
}

export interface ResponseObject {
  description: string;
  content?: Record<string, { schema: Record<string, unknown> }>;
}

export interface BuilderOptions {
  title?: string;
  version?: string;
  description?: string;
}

export function buildOpenAPIDocument(
  entries: Map<string, TrafficEntry[]>,
  options: BuilderOptions = {}
): OpenAPIDocument {
  const paths: Record<string, PathItem> = {};

  for (const [routeKey, routeEntries] of entries) {
    const [method, path] = routeKey.split(' ', 2);
    if (!path) continue;

    const inferred = inferFromTrafficEntries(routeEntries);
    const operation = buildOperation(routeEntries, inferred);

    if (!paths[path]) paths[path] = {};
    paths[path][method.toLowerCase()] = operation;
  }

  return {
    openapi: '3.0.3',
    info: {
      title: options.title ?? 'RouteWatch API',
      version: options.version ?? '1.0.0',
      ...(options.description ? { description: options.description } : {}),
    },
    paths,
  };
}

function buildOperation(
  entries: TrafficEntry[],
  inferred: ReturnType<typeof inferFromTrafficEntries>
): OperationObject {
  const statusCodes = [...new Set(entries.map((e) => e.statusCode))];
  const responses: Record<string, ResponseObject> = {};

  for (const code of statusCodes) {
    const codeEntries = entries.filter((e) => e.statusCode === code);
    const responseSchema = inferFromTrafficEntries(
      codeEntries.map((e) => ({ ...e, requestBody: e.responseBody })) as TrafficEntry[]
    );
    responses[String(code)] = {
      description: `HTTP ${code}`,
      ...(responseSchema.responseSchema
        ? { content: { 'application/json': { schema: responseSchema.responseSchema } } }
        : {}),
    };
  }

  const operation: OperationObject = { responses };

  if (inferred.querySchema) {
    operation.parameters = buildQueryParameters(inferred.querySchema);
  }

  if (inferred.requestSchema) {
    operation.requestBody = {
      required: true,
      content: { 'application/json': { schema: inferred.requestSchema } },
    };
  }

  return operation;
}

function buildQueryParameters(
  querySchema: Record<string, unknown>
): ParameterObject[] {
  const properties = (querySchema as any).properties ?? {};
  const required: string[] = (querySchema as any).required ?? [];
  return Object.entries(properties).map(([name, schema]) => ({
    name,
    in: 'query',
    required: required.includes(name),
    schema: schema as Record<string, unknown>,
  }));
}
