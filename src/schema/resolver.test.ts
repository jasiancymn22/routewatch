import { resolveRef, resolveSchema, resolveSchemaMap, isReferenceObject } from './resolver';

const components = {
  User: {
    type: 'object' as const,
    properties: {
      id: { type: 'integer' as const },
      name: { type: 'string' as const },
    },
  },
  Address: {
    type: 'object' as const,
    properties: {
      street: { type: 'string' as const },
    },
  },
};

describe('isReferenceObject', () => {
  it('returns true for objects with $ref', () => {
    expect(isReferenceObject({ $ref: '#/components/schemas/User' })).toBe(true);
  });

  it('returns false for plain schema objects', () => {
    expect(isReferenceObject({ type: 'string' })).toBe(false);
  });
});

describe('resolveRef', () => {
  it('resolves a valid #/components/schemas ref', () => {
    const result = resolveRef('#/components/schemas/User', components);
    expect(result).toEqual(components.User);
  });

  it('returns undefined for unknown ref', () => {
    const result = resolveRef('#/components/schemas/Unknown', components);
    expect(result).toBeUndefined();
  });

  it('returns undefined for non-standard ref paths', () => {
    const result = resolveRef('#/definitions/User', components);
    expect(result).toBeUndefined();
  });
});

describe('resolveSchema', () => {
  it('resolves a $ref to its schema', () => {
    const result = resolveSchema({ $ref: '#/components/schemas/User' }, components);
    expect(result).toEqual(components.User);
  });

  it('returns plain schema unchanged (structurally)', () => {
    const schema = { type: 'string' as const };
    const result = resolveSchema(schema, components);
    expect(result.type).toBe('string');
  });

  it('resolves nested $ref in properties', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        user: { $ref: '#/components/schemas/User' },
      },
    };
    const result = resolveSchema(schema, components);
    expect(result.properties?.user).toEqual(components.User);
  });

  it('resolves $ref in array items', () => {
    const schema = {
      type: 'array' as const,
      items: { $ref: '#/components/schemas/Address' },
    };
    const result = resolveSchema(schema, components);
    expect(result.items).toEqual(components.Address);
  });

  it('handles circular refs without infinite loop', () => {
    const circular: Record<string, any> = {
      Node: {
        type: 'object',
        properties: {
          child: { $ref: '#/components/schemas/Node' },
        },
      },
    };
    expect(() => resolveSchema({ $ref: '#/components/schemas/Node' }, circular)).not.toThrow();
  });
});

describe('resolveSchemaMap', () => {
  it('resolves all schemas in a map', () => {
    const map = {
      userRef: { $ref: '#/components/schemas/User' },
      addrRef: { $ref: '#/components/schemas/Address' },
    };
    const result = resolveSchemaMap(map, components);
    expect(result.userRef).toEqual(components.User);
    expect(result.addrRef).toEqual(components.Address);
  });
});
