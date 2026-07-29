import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * Symmetric encryption for channel credentials AT REST.
 *
 * Access tokens (Meta long-lived tokens, Telegram bot tokens) are CREDENTIALS.
 * They are NEVER stored in plaintext, never logged, and never returned to the
 * client. We encrypt with AES-256-GCM keyed off `KUZA_ENCRYPTION_KEY`; the
 * ciphertext (plus iv + auth tag) is what lands in the `config` jsonb. GCM's
 * auth tag makes the blob tamper-evident.
 *
 * The env value can be any string — we derive a stable 32-byte key from it with
 * SHA-256, so operators are not forced to produce exactly 32 raw bytes.
 */

const VERSION = 'v1';

function key(): Buffer {
  const secret = process.env.KUZA_ENCRYPTION_KEY;
  if (!secret) {
    // Fail closed: refuse to "encrypt" with a predictable key. Callers that
    // touch credentials must have the key configured.
    throw new Error('KUZA_ENCRYPTION_KEY is not set — cannot secure channel credentials');
  }
  return createHash('sha256').update(secret, 'utf8').digest();
}

/** Encrypt a secret string → `v1:<ivB64>:<tagB64>:<cipherB64>`. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

/** Decrypt a blob produced by encryptSecret. Throws on tamper / wrong key. */
export function decryptSecret(blob: string): string {
  const parts = String(blob).split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Malformed encrypted secret');
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * A tamper-proof, expiring OAuth `state` blob. We can't rely on request/tenant
 * context in the @Public OAuth callback, so the initiate step encrypts the
 * tenant + connection identity into `state`; the callback decrypts it. Encrypted
 * (not just signed) so tenant/schema identifiers are never exposed in the URL.
 */
export interface OAuthState {
  tenantId: string;
  schemaName: string;
  connectionId: string;
  type: string;
  /** epoch ms expiry */
  exp: number;
}

export function encodeOAuthState(state: Omit<OAuthState, 'exp'>, ttlMs = 10 * 60_000): string {
  const full: OAuthState = { ...state, exp: Date.now() + ttlMs };
  return encodeURIComponent(encryptSecret(JSON.stringify(full)));
}

export function decodeOAuthState(raw: string): OAuthState {
  const state = JSON.parse(decryptSecret(decodeURIComponent(raw))) as OAuthState;
  if (!state.exp || state.exp < Date.now()) {
    throw new Error('OAuth state expired');
  }
  return state;
}
