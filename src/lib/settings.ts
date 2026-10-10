// Settings edited on the Retell tab. Pure functions only: storage lives in settings-store.ts.

export const MIN_INTERVAL_MINUTES = 5; // the cron tick; a shorter interval cannot be honoured
export const DEFAULT_INTERVAL_MINUTES = 10;
export const MAX_INTERVAL_MINUTES = 1440;

// Cron jitter: a tick can land a little before the interval is full.
const SLACK_MS = 60_000;

export type Settings = {
  intervalMinutes: number;
  // Public base URL of this Twenty server, e.g. https://crm.example.com. Empty = take it from the server environment.
  publicUrl: string;
  // Retell agents that get the webhook. Empty = every agent.
  agentIds: string[];
  // Defaults for outbound calls placed from Twenty. Empty agent = the agent bound to the number in Retell.
  outboundFromNumber: string;
  outboundAgentId: string;
  // The same for SMS chats started from Twenty: an SMS-enabled number and a chat agent.
  smsFromNumber: string;
  smsAgentId: string;
};

export const isE164 = (value: string): boolean => /^\+\d{8,15}$/.test(value);

export const normalizeSettings = (raw: Partial<Settings> | null | undefined): Settings => {
  const interval = Math.round(Number(raw?.intervalMinutes));
  const url = String(raw?.publicUrl ?? '').trim().replace(/\/+$/, '');
  const fromNumber = String(raw?.outboundFromNumber ?? '').trim();
  const smsNumber = String(raw?.smsFromNumber ?? '').trim();

  return {
    intervalMinutes: Number.isFinite(interval) && interval > 0
      ? Math.min(MAX_INTERVAL_MINUTES, Math.max(MIN_INTERVAL_MINUTES, interval))
      : DEFAULT_INTERVAL_MINUTES,
    publicUrl: /^https?:\/\/[^\s/]+/.test(url) ? url : '',
    agentIds: Array.isArray(raw?.agentIds) ? raw.agentIds.filter((id) => typeof id === 'string' && id) : [],
    outboundFromNumber: isE164(fromNumber) ? fromNumber : '',
    outboundAgentId: String(raw?.outboundAgentId ?? '').trim(),
    smsFromNumber: isE164(smsNumber) ? smsNumber : '',
    smsAgentId: String(raw?.smsAgentId ?? '').trim(),
  };
};

export const isSyncDue = (lastRunAt: number | null, now: number, intervalMinutes: number): boolean =>
  lastRunAt === null || now - lastRunAt >= intervalMinutes * 60_000 - SLACK_MS;

// Retell calls the webhook from the internet, so localhost, private ranges and bare container names cannot work.
export const isPublicUrl = (url: string): boolean => {
  const host = url.match(/^https?:\/\/([^/:?#]+)/i)?.[1]?.toLowerCase();
  if (!host || !host.includes('.')) return false;
  if (/^(127|10|0)\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  return !/\.(local|internal|localhost|invalid)$/.test(host);
};

// The webhook route is served under /s on the Twenty server.
export const webhookUrlFor = (baseUrl: string): string => `${baseUrl.replace(/\/+$/, '')}/s/retell/webhook`;
