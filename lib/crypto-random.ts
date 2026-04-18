/**
 * Cryptographically secure random string utilities.
 *
 * Use these for security-sensitive generation (passwords, verification codes,
 * nonces). Built on Node's crypto.randomInt which gives uniformly distributed
 * integers — no modulo bias from naive randomBytes() usage.
 *
 * Do NOT use Math.random() for any of these purposes.
 */

import { randomInt } from 'crypto';

/** Pick one random character from `charset` using a CSPRNG. */
export function randomChar(charset: string): string {
  if (charset.length === 0) throw new Error('charset cannot be empty');
  return charset.charAt(randomInt(0, charset.length));
}

/** Generate a random string of `length` characters from `charset`. */
export function randomString(length: number, charset: string): string {
  let out = '';
  for (let i = 0; i < length; i++) out += randomChar(charset);
  return out;
}

/** Fisher–Yates shuffle using a CSPRNG. Returns a new array. */
export function secureShuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Generate a cryptographically-strong password of `length` characters
 * (default 12) that contains at least one lowercase letter, uppercase
 * letter, digit, and special character. Final order is shuffled.
 */
export function generateSecurePassword(length: number = 12): string {
  if (length < 4) throw new Error('password length must be >= 4');
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%^&*';
  const all = lowercase + uppercase + digits + special;

  const chars: string[] = [
    randomChar(lowercase),
    randomChar(uppercase),
    randomChar(digits),
    randomChar(special),
  ];
  for (let i = chars.length; i < length; i++) chars.push(randomChar(all));
  return secureShuffle(chars).join('');
}

/**
 * Generate a human-readable code from an unambiguous alphabet (no 0/O/1/I/l).
 * Suitable for verification codes and codes people type or read aloud.
 */
export function generateReadableCode(
  length: number,
  opts: { includeSpecial?: boolean } = {}
): string {
  const base = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const charset = opts.includeSpecial ? base + '!@#$%' : base;
  return randomString(length, charset);
}
