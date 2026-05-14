import { validateAgainstSchema, isNonTrivialSchema } from './validator';
import { OpenAPIV3 } from 'openapi-types';

describe('validateAgainstSchema', () => {
  it('validates a simple string schema', () => {
    const schema: OpenAPIV3.SchemaObject = { type: 'string' };
    expect(validateAgainstSchema('hello', schema)).toEqual({ valid: true, errors: [] });
    expect(validateAgainstSchema(42, schema).valid).toBe(false);
  });

  it('validates a number schema', () => {
    const schema: OpenAPIV3.SchemaObject = { type: 'number' };
    expect(validateAgainstSchema(3.14, schema).valid).toBe(true);
    expect(validateAgainstSchema('3.14', schema).valid).toBe(false);
  });

  it('validates a boolean schema', () => {
    const schema: OpenAPIV3.SchemaObject = { type: 'boolean' };
    expect(validateAgainstSchema(true, schema).valid).toBe(true);
    expect(validateAgainstSchema(0, schema).valid).toBe(false);
  });

  it('validates an object schema with required fields', () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
      },
    };
    expect(validateAgainstSchema({ id: 1, name: 'Alice' }, schema).valid).toBe(true);
    const result = validateAgainstSchema({ id: 1 }, schema);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required property: "name"');
  });

  it('reports nested property type errors', () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: {
        age: { type: 'number' },
      },
    };
    const result = validateAgainstSchema({ age: 'old' }, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('age'))).toBe(true);
  });

  it('validates an array schema', () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: 'array',
      items: { type: 'string' },
    };
    expect(validateAgainstSchema(['a', 'b'], schema).valid).toBe(true);
    const result = validateAgainstSchema(['a', 2], schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('[1]'))).toBe(true);
  });

  it('returns error when array expected but object given', () => {
    const schema: OpenAPIV3.SchemaObject = { type: 'array', items: { type: 'string' } };
    const result = validateAgainstSchema({}, schema);
    expect(result.valid).toBe(false);
  });
});

describe('isNonTrivialSchema', () => {
  it('returns true for schema with type', () => {
    expect(isNonTrivialSchema({ type: 'string' })).toBe(true);
  });

  it('returns true for schema with properties', () => {
    expect(isNonTrivialSchema({ properties: { a: { type: 'number' } } })).toBe(true);
  });

  it('returns false for empty schema', () => {
    expect(isNonTrivialSchema({})).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isNonTrivialSchema(null as any)).toBe(false);
  });
});
