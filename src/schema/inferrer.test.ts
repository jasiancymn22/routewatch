import { inferType, inferSchema, mergeSchemas, inferFromTrafficEntries } from './inferrer';
import { TrafficEntry } from '../traffic/types';

describe('inferType', () => {
  it('returns null for null values', () => {
    expect(inferType(null)).toBe('null');
  });

  it('returns array for arrays', () => {
    expect(inferType([1, 2, 3])).toBe('array');
  });

  it('returns correct primitive types', () => {
    expect(inferType('hello')).toBe('string');
    expect(inferType(42)).toBe('number');
    expect(inferType(true)).toBe('boolean');
  });
});

describe('inferSchema', () => {
  it('infers schema for a flat object', () => {
    const schema = inferSchema({ name: 'Alice', age: 30 });
    expect(schema.type).toBe('object');
    expect(schema.properties?.name.type).toBe('string');
    expect(schema.properties?.age.type).toBe('number');
  });

  it('infers schema for an array', () => {
    const schema = inferSchema([{ id: 1 }]);
    expect(schema.type).toBe('array');
    expect(schema.items?.type).toBe('object');
  });

  it('infers schema for primitives', () => {
    expect(inferSchema('test')).toEqual({ type: 'string', example: 'test' });
    expect(inferSchema(99)).toEqual({ type: 'number', example: 99 });
  });
});

describe('mergeSchemas', () => {
  it('merges two object schemas', () => {
    const a = inferSchema({ name: 'Alice' });
    const b = inferSchema({ name: 'Bob', age: 25 });
    const merged = mergeSchemas(a, b);
    expect(merged.type).toBe('object');
    expect(merged.properties).toHaveProperty('name');
    expect(merged.properties).toHaveProperty('age');
  });

  it('returns generic object when types differ', () => {
    const a = inferSchema('string');
    const b = inferSchema(42);
    expect(mergeSchemas(a, b).type).toBe('object');
  });
});

describe('inferFromTrafficEntries', () => {
  const mockEntry = (req?: unknown, res?: unknown): TrafficEntry => ({
    method: 'POST',
    path: '/users',
    statusCode: 200,
    requestBody: req,
    responseBody: res,
    timestamp: Date.now(),
    duration: 10,
  });

  it('infers request and response schemas from entries', () => {
    const entries = [
      mockEntry({ name: 'Alice' }, { id: 1, name: 'Alice' }),
      mockEntry({ name: 'Bob' }, { id: 2, name: 'Bob' }),
    ];
    const { requestBody, responseBody } = inferFromTrafficEntries(entries);
    expect(requestBody?.type).toBe('object');
    expect(responseBody?.type).toBe('object');
    expect(responseBody?.properties).toHaveProperty('id');
  });

  it('handles entries without bodies', () => {
    const entries = [mockEntry(undefined, undefined)];
    const { requestBody, responseBody } = inferFromTrafficEntries(entries);
    expect(requestBody).toBeUndefined();
    expect(responseBody).toBeUndefined();
  });
});
