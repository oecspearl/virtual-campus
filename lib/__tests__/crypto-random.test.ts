import { describe, it, expect } from 'vitest';
import {
  randomChar,
  randomString,
  secureShuffle,
  generateSecurePassword,
  generateReadableCode,
} from '../crypto-random';

describe('randomChar', () => {
  it('returns a character from the given charset', () => {
    const charset = 'abcdef';
    for (let i = 0; i < 100; i++) {
      expect(charset).toContain(randomChar(charset));
    }
  });

  it('throws on empty charset', () => {
    expect(() => randomChar('')).toThrow();
  });
});

describe('randomString', () => {
  it('returns a string of the requested length', () => {
    expect(randomString(20, 'abc').length).toBe(20);
  });

  it('only contains characters from the charset', () => {
    const charset = 'xyz';
    const out = randomString(100, charset);
    for (const c of out) expect(charset).toContain(c);
  });

  it('produces different strings on repeated calls (entropy sanity)', () => {
    const a = randomString(20, 'abcdefghijklmnopqrstuvwxyz');
    const b = randomString(20, 'abcdefghijklmnopqrstuvwxyz');
    expect(a).not.toBe(b);
  });
});

describe('secureShuffle', () => {
  it('returns an array with the same elements', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const out = secureShuffle(input);
    expect(out.sort()).toEqual(input.sort());
  });

  it('does not mutate the input', () => {
    const input = [1, 2, 3];
    const before = input.slice();
    secureShuffle(input);
    expect(input).toEqual(before);
  });
});

describe('generateSecurePassword', () => {
  it('returns a string of default length 12', () => {
    expect(generateSecurePassword().length).toBe(12);
  });

  it('respects custom length', () => {
    expect(generateSecurePassword(20).length).toBe(20);
  });

  it('contains at least one lowercase, uppercase, digit, and special char', () => {
    for (let i = 0; i < 20; i++) {
      const p = generateSecurePassword();
      expect(/[a-z]/.test(p)).toBe(true);
      expect(/[A-Z]/.test(p)).toBe(true);
      expect(/[0-9]/.test(p)).toBe(true);
      expect(/[!@#$%^&*]/.test(p)).toBe(true);
    }
  });

  it('rejects lengths under 4', () => {
    expect(() => generateSecurePassword(3)).toThrow();
  });
});

describe('generateReadableCode', () => {
  it('excludes ambiguous characters by default', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateReadableCode(8);
      expect(code).not.toMatch(/[0O1Il]/);
    }
  });

  it('returns a string of the requested length', () => {
    expect(generateReadableCode(10).length).toBe(10);
  });
});
