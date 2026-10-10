import { kv } from 'twenty-sdk/logic-function';

import { normalizeSettings, webhookUrlFor, type Settings } from 'src/lib/settings';

const SETTINGS_KEY = 'settings';
const LAST_RUN_KEY = 'sync:lastRunAt';
const LAST_SYNC_KEY = 'sync:last';
const LAST_WEBHOOK_KEY = 'webhook:lastAt';
const LAST_REJECTED_KEY = 'webhook:lastRejectedAt';
const LAST_REJECTED_REASON_KEY = 'webhook:lastRejectedReason';

export const getSettings = async (): Promise<Settings> =>
  normalizeSettings(await kv.get<Partial<Settings>>(SETTINGS_KEY));

export const saveSettings = async (input: Partial<Settings>): Promise<Settings> => {
  const settings = normalizeSettings(input);
  await kv.set(SETTINGS_KEY, settings);
  return settings;
};

export const getLastRunAt = (): Promise<number | null> => kv.get<number>(LAST_RUN_KEY);
export const setLastRunAt = (at: number) => kv.set(LAST_RUN_KEY, at);

export type LastSync = { at: number; trigger: 'schedule' | 'manual'; ok: boolean; calls?: unknown; chats?: unknown; dnc?: unknown; error?: string };
export const getLastSync = (): Promise<LastSync | null> => kv.get<LastSync>(LAST_SYNC_KEY);
export const setLastSync = (value: LastSync) => kv.set(LAST_SYNC_KEY, value);

// Resync job: a forced re-read of Retell history for a chosen period, advanced a chunk at a time by the cron tick.
export type ResyncTotals = { created: number; updated: number; failed: number; done: boolean; error?: string };
export type ResyncJob = { startedAt: number; days: number; done: boolean; finishedAt?: number; calls: ResyncTotals; chats: ResyncTotals };
const RESYNC_JOB_KEY = 'resync:job';
const RESYNC_BUSY_KEY = 'resync:busyUntil';
export const getResyncJob = (): Promise<ResyncJob | null> => kv.get<ResyncJob>(RESYNC_JOB_KEY);
export const setResyncJob = (job: ResyncJob) => kv.set(RESYNC_JOB_KEY, job);
export const getResyncBusyUntil = (): Promise<number | null> => kv.get<number>(RESYNC_BUSY_KEY);
export const setResyncBusyUntil = (at: number) => kv.set(RESYNC_BUSY_KEY, at);

export const getLastWebhookAt = (): Promise<number | null> => kv.get<number>(LAST_WEBHOOK_KEY);
export const setLastWebhookAt = (at: number) => kv.set(LAST_WEBHOOK_KEY, at);

// A webhook that reached the server but failed the signature check. Almost always the saved key lacks the webhook badge.
export const getLastRejectedAt = (): Promise<number | null> => kv.get<number>(LAST_REJECTED_KEY);
export const getLastRejectedReason = (): Promise<string | null> => kv.get<string>(LAST_REJECTED_REASON_KEY);
export const setLastRejected = async (at: number, reason: string) => {
  await kv.set(LAST_REJECTED_KEY, at);
  await kv.set(LAST_REJECTED_REASON_KEY, reason);
};

// The base URL is the one the user typed, else what the server reports. Inside a container the
// server may report an internal address, which is why the Retell tab shows it and lets it be overridden.
export const resolveBaseUrl = (settings: Settings): string =>
  settings.publicUrl || (process.env.TWENTY_API_URL ?? '').replace(/\/+$/, '');

export const resolveWebhookUrl = (settings: Settings): string => webhookUrlFor(resolveBaseUrl(settings));
