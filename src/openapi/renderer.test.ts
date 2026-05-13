import { renderDocument } from './renderer';
import { OpenAPIDocument } from './builder';

const sampleDoc: OpenAPIDocument = {
  openapi: '3.0.3',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/users': {
      get: {
        responses: {
          '200': {
            description: 'HTTP 200',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
  },
};

describe('renderDocument', () => {
  describe('JSON format', () => {
    it('returns valid JSON string', () => {
      const output = renderDocument(sampleDoc, 'json');
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('parsed JSON matches original document', () => {
      const output = renderDocument(sampleDoc, 'json');
      expect(JSON.parse(output)).toEqual(sampleDoc);
    });

    it('defaults to JSON format when no format specified', () => {
      const output = renderDocument(sampleDoc);
      expect(() => JSON.parse(output)).not.toThrow();
    });
  });

  describe('YAML format', () => {
    it('returns a non-empty string', () => {
      const output = renderDocument(sampleDoc, 'yaml');
      expect(output.length).toBeGreaterThan(0);
    });

    it('contains openapi version', () => {
      const output = renderDocument(sampleDoc, 'yaml');
      expect(output).toContain('3.0.3');
    });

    it('contains path keys', () => {
      const output = renderDocument(sampleDoc, 'yaml');
      expect(output).toContain('/users');
    });

    it('contains title', () => {
      const output = renderDocument(sampleDoc, 'yaml');
      expect(output).toContain('Test API');
    });

    it('does not produce JSON-style output', () => {
      const output = renderDocument(sampleDoc, 'yaml');
      expect(output.startsWith('{')).toBe(false);
    });
  });
});
