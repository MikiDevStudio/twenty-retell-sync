import { createHmac, timingSafeEqual } from 'node:crypto';

const SIGNATURE_PATTERN = /^v=(\d+),d=([0-9a-fA-F]+)$/;
const TOLERANCE_MS = 5 * 60 * 1000;

// Retell signs `raw_body + timestamp` with HMAC-SHA256 keyed by the webhook-badged API key.
// Header format: `v={timestamp_ms},d={hex_digest}` (docs.retellai.com/features/secure-webhook).
// The exact request body Retell signed. Twenty gives it as rawBody; when the runtime did not keep it, fall back
// to a string or base64 body. A parsed (re-serialized) body is never used: it would not match the signature.
export type RawBody = { text: string; source: 'rawBody' | 'body-string' | 'body-base64' | 'missing' };

export const rawBodyOf = (event: { rawBody?: string; body?: unknown; isBase64Encoded?: boolean }): RawBody => {
  if (typeof event.rawBody === 'string') return { text: event.rawBody, source: 'rawBody' };
  if (typeof event.body === 'string') {
    return event.isBase64Encoded
      ? { text: Buffer.from(event.body, 'base64').toString('utf8'), source: 'body-base64' }
      : { text: event.body, source: 'body-string' };
  }
  return { text: '', source: 'missing' };
};

// Why a signature failed, for the Retell tab. Never includes the key, the body or the digest.
export const explainRejection = (header: string | undefined, apiKey: string, body: RawBody, now: number = Date.now()): string => {
  if (!apiKey) return 'no Retell API key is saved';
  if (!header) return 'no signature header';
  const match = SIGNATURE_PATTERN.exec(header.trim());
  if (!match) return 'signature header has an unexpected format';
  const skewSeconds = Math.round((now - Number(match[1])) / 1000);
  if (Math.abs(skewSeconds * 1000) > TOLERANCE_MS) return `server clock differs from the signature time by ${skewSeconds} s`;
  if (body.source === 'missing') return 'the server did not pass the request body to the app (rawBody is missing)';
  return `digest does not match: the saved key is not the one Retell signs with, or the body was altered on the way (body from ${body.source}, ${body.text.length} characters)`;
};

export const verifyRetellSignature = (
  rawBody: string,
  apiKey: string,
  header: string | undefined,
  now: number = Date.now(),
): boolean => {
  if (!header || !apiKey) return false;

  const match = SIGNATURE_PATTERN.exec(header.trim());
  if (!match) return false;

  const [, timestamp, digest] = match;
  if (Math.abs(now - Number(timestamp)) > TOLERANCE_MS) return false;

  const expected = createHmac('sha256', apiKey).update(rawBody + timestamp).digest();
  const received = Buffer.from(digest, 'hex');

  return received.length === expected.length && timingSafeEqual(received, expected);
};
