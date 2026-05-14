import { deepMergeSchemas, mergeSchemaList } from './merger';
import { OpenAPIV3 } from 'openapi-types';

type SchemaObject = OpenAPIV3.SchemaObject;

describe('deepMergeSchemas', () => {
  it('returns oneOf when types differ', () => {
    const a: SchemaObject = { type: 'string' };
    const b: SchemaObject = { type: 'number' };
    const result = deepMergeSchemas(a, b);
    expect(result).toEqual({ oneOf: [a, b] });
  });

  it('merges object properties', () => {
    const a: SchemaObject = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    };
    const b: SchemaObject = {
      type: 'object',
      properties: { age: { type: 'number' } },
      required: ['age'],
    };
    const result = deepMergeSchemas(a, b);
    expect(result.type).toBe('object');
    expect(result.properties).toHaveProperty('name');
    expect(result.properties).toHaveProperty('age');
    expect(result.required).toEqual([]);
  });

  it('keeps required fields present in both schemas', () => {
    const a: SchemaObject = {
      type: 'object',
      properties: { id: { type: 'string' }, name: { type: 'string' } },
      required: ['id', 'name'],
    };
    const b: SchemaObject = {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    };
    const result = deepMergeSchemas(a, b);
    expect(result.required).toEqual(['id']);
  });

  it('merges nested array items', () => {
    const a: SchemaObject = { type: 'array', items: { type: 'string' } };
    const b: SchemaObject = { type: 'array', items: { type: 'string' } };
    const result = deepMergeSchemas(a, b);
    expect(result).toEqual({ type: 'array', items: { type: 'string' } });
  });

  it('returns oneOf for mismatched array item types', () => {
    const a: SchemaObject = { type: 'array', items: { type: 'string' } };
    const b: SchemaObject = { type: 'array', items: { type: 'number' } };
    const result = deepMergeSchemas(a, b);
    expect((result.items as SchemaObject).oneOf).toBeDefined();
  });

  it('returns first schema for identical primitives', () => {
    const a: SchemaObject = { type: 'boolean' };
    const b: SchemaObject = { type: 'boolean' };
    expect(deepMergeSchemas(a, b)).toEqual({ type: 'boolean' });
  });
});

describe('mergeSchemaList', () => {
  it('returns empty object for empty list', () => {
    expect(mergeSchemaList([])).toEqual({});
  });

  it('returns single schema unchanged', () => {
    const s: SchemaObject = { type: 'string' };
    expect(mergeSchemaList([s])).toEqual(s);
  });

  it('merges multiple schemas sequentially', () => {
    const schemas: SchemaObject[] = [
      { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
      { type: 'object', properties: { b: { type: 'number' } }, required: ['b'] },
      { type: 'object', properties: { a: { type: 'string' }, b: { type: 'number' } }, required: ['a', 'b'] },
    ];
    const result = mergeSchemaList(schemas);
    expect(result.type).toBe('object');
    expect(result.properties).toHaveProperty('a');
    expect(result.properties).toHaveProperty('b');
  });
});
