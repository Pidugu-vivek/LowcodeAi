import { applyMappings, getByPath, setByPath, registerTransform } from '../../src/mapping/fieldMapper';

describe('fieldMapper', () => {
  describe('getByPath', () => {
    it('resolves nested dot-paths', () => {
      expect(getByPath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
    });

    it('returns undefined for missing paths without throwing', () => {
      expect(getByPath({ a: {} }, 'a.b.c')).toBeUndefined();
      expect(getByPath(null, 'a.b')).toBeUndefined();
    });
  });

  describe('setByPath', () => {
    it('creates intermediate objects as needed', () => {
      const target: Record<string, unknown> = {};
      setByPath(target, 'a.b.c', 42);
      expect(target).toEqual({ a: { b: { c: 42 } } });
    });
  });

  describe('applyMappings', () => {
    it('maps fields from source to a new output object', () => {
      const output = applyMappings(
        { body: { pan: 'ABCDE1234F' } },
        [{ from: 'body.pan', to: 'pan' }],
      );
      expect(output).toEqual({ pan: 'ABCDE1234F' });
    });

    it('applies a default when the source value is undefined', () => {
      const output = applyMappings({ body: {} }, [{ from: 'body.missing', to: 'x', default: 'fallback' }]);
      expect(output).toEqual({ x: 'fallback' });
    });

    it('applies named transforms', () => {
      const output = applyMappings({ body: { name: 'sample' } }, [
        { from: 'body.name', to: 'name', transform: 'toUpperCase' },
      ]);
      expect(output).toEqual({ name: 'SAMPLE' });
    });

    it('throws on an unknown transform name', () => {
      expect(() =>
        applyMappings({ body: { name: 'sample' } }, [
          { from: 'body.name', to: 'name', transform: 'notRegistered' },
        ]),
      ).toThrow(/Unknown field mapping transform/);
    });

    it('supports custom registered transforms', () => {
      registerTransform('reverse', (v) => (typeof v === 'string' ? v.split('').reverse().join('') : v));
      const output = applyMappings({ body: { name: 'abc' } }, [
        { from: 'body.name', to: 'name', transform: 'reverse' },
      ]);
      expect(output).toEqual({ name: 'cba' });
    });
  });
});
