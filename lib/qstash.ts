import { Client, Receiver } from '@upstash/qstash';

let publisher: Client | null = null;
let receiver: Receiver | null = null;

export function getQStashClient(): Client | null {
  if (publisher) return publisher;
  const token = process.env.QSTASH_TOKEN;
  if (!token) return null;
  publisher = new Client({ token });
  return publisher;
}

export function getQStashReceiver(): Receiver | null {
  if (receiver) return receiver;
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!currentSigningKey || !nextSigningKey) return null;
  receiver = new Receiver({ currentSigningKey, nextSigningKey });
  return receiver;
}

/**
 * Resolve the publicly reachable base URL for QStash callbacks.
 * Prefers explicit override → Vercel-injected URL → app URL.
 */
export function getPublicBaseUrl(): string {
  const explicit = process.env.QSTASH_CALLBACK_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  const app = process.env.NEXT_PUBLIC_APP_URL;
  if (app) return app.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export interface EnqueueOptions {
  /** Absolute path on this app, e.g. '/api/jobs/send-welcome-email' */
  path: string;
  /** JSON body delivered to the worker route */
  body: Record<string, unknown>;
  /** Optional dedupe key — QStash drops duplicates for ~10min */
  deduplicationId?: string;
  /** Retries on 5xx; default 3 */
  retries?: number;
  /** Delay before delivery (seconds) */
  delaySeconds?: number;
}

/**
 * Enqueue an async job. Returns the QStash message ID or null if QStash isn't configured.
 * Caller should fall back to synchronous execution if null is returned.
 */
export async function enqueueJob(opts: EnqueueOptions): Promise<string | null> {
  const client = getQStashClient();
  if (!client) {
    console.warn(`[qstash] QSTASH_TOKEN not set — job for ${opts.path} not queued.`);
    return null;
  }
  const url = `${getPublicBaseUrl()}${opts.path}`;
  const res = await client.publishJSON({
    url,
    body: opts.body,
    retries: opts.retries ?? 3,
    delay: opts.delaySeconds,
    deduplicationId: opts.deduplicationId,
  });
  return res.messageId;
}

/**
 * Verifies an incoming QStash request signature. Throws if invalid.
 * Worker routes must call this before processing.
 */
export async function verifyQStashRequest(
  signature: string | null,
  rawBody: string,
): Promise<void> {
  const r = getQStashReceiver();
  if (!r) {
    throw new Error('QStash signing keys not configured');
  }
  if (!signature) {
    throw new Error('Missing Upstash-Signature header');
  }
  const valid = await r.verify({ signature, body: rawBody });
  if (!valid) {
    throw new Error('Invalid QStash signature');
  }
}
