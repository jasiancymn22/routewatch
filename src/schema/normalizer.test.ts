import { stripEmptyFields, normalizeSchema, normalizeSchemaMap } from './normalizer';

describe('stripEmptyFields', () => {
  it('removes undefined values', () => {
    const result = stripEmptyFields({ type: 'string', description: undefined } as any);
    expect(result).toEqual({ type: 'string' });
  });

  it('removes empty object values', () => {
    const result = stripEmptyFields({ type: 'object', properties: {} } as any);
    expect(result).toEqual({ type: 'object' });
  });

  it('keeps non-empty arrays', () => {
    const result = stripEmptyFields({ type: 'array', enum: ['a', 'b'] } as any);
    expect(result).toHaveProperty('enum');
  });
});

describe('normalizeSchema', () => {
  it('recursively normalizes nested object properties', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', description: undefined },
      },
    } as any;
    const result = normalizeSchema(schema);
    expect(result.properties!.name).toEqual({ type: 'string' });
  });

  it('sets additionalProperties true on objects by default', () => {
    const result = normalizeSchema({ type: 'object', properties: { id: { type: 'number' } } });
    expect(result.additionalProperties).toBe(true);
  });

  it('does not override explicit additionalProperties', () => {
    const result = normalizeSchema({
      type: 'object',
      properties: {},
      additionalProperties: false,
    });
    expect(result.additionalProperties).toBe(false);
  });

  it('recursively normalizes array items', () => {
    const schema = {
      type: 'array',
      items: { type: 'string', description: undefined },
    } as any;
    const result = normalizeSchema(schema);
    expect(result.items).toEqual({ type: 'string' });
  });

  it('normalizes allOf entries', () => {
    const schema = {
      allOf: [
        { type: 'object', properties: { x: { type: 'number', description: undefined } } },
      ],
    } as any;
    const result = normalizeSchema(schema);
    const first = result.allOf![0] as any;
    expect(first.properties.x).toEqual({ type: 'number' });
  });
});

describe('normalizeSchemaMap', () => {
  it('normalizes each schema in the map', () => {
    const map = {
      '/users': { type: 'object', properties: { id: { type: 'string', description: undefined } } },
      '/posts': { type: 'array', items: { type: 'string', description: undefined } },
    } as any;
    const result = normalizeSchemaMap(map);
    expect((result['/users'].properties as any).id).toEqual({ type: 'string' });
    expect(result['/posts'].items).toEqual({ type: 'string' });
  });
});
