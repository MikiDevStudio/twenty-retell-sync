import { kv } from 'twenty-sdk/logic-function';

import { reconcileDnc } from 'src/lib/dnc-sync';
import { getCall, getChat, listCalls, listChats } from 'src/lib/retell-api';
import { saveCall, saveChat } from 'src/lib/save';
import {
  getResyncBusyUntil,
  getResyncJob,
  setLastRunAt,
  setLastSync,
  setResyncBusyUntil,
  setResyncJob,
  type ResyncJob,
  type ResyncTotals,
} from 'src/lib/settings-store';
import { CALL_KIND, CHAT_KIND, findExisting } from 'src/lib/store';
import { syncKind, type SyncDeps, type SyncReport } from 'src/lib/sync';

const FINAL_CALL = new Set(['ended', 'error', 'not_connected']);
const FINAL_CHAT = new Set(['ended', 'error']);

const watermark = (key: string): SyncDeps['watermark'] => ({
  get: () => kv.get<number>(key),
  set: (value) => kv.set(key, value),
});

const DAY_MS = 24 * 60 * 60 * 1000;
const BUSY_MS = 5 * 60 * 1000;

type Mode = { cursorKey: (kind: 'calls' | 'chats') => string; force: boolean; maxPerRun: number };

const NORMAL: Mode = { cursorKey: (kind) => `sync:${kind}:watermark`, force: false, maxPerRun: 100 };
const RESYNC: Mode = { cursorKey: (kind) => `resync:${kind}:cursor`, force: true, maxPerRun: 50 };

const syncCalls = (now: number, mode: Mode) =>
  syncKind({
    now,
    backfillDays: Number(process.env.SYNC_BACKFILL_DAYS) || 30,
    maxPerRun: mode.maxPerRun,
    force: mode.force,
    list: listCalls,
    fetchFull: getCall,
    idOf: (item) => item.call_id,
    isFinal: (item) => FINAL_CALL.has(item.call_status),
    hasAnalysis: (item) => Boolean(item.call_analysis?.call_summary),
    find: (id) => findExisting(CALL_KIND, id),
    save: saveCall,
    watermark: watermark(mode.cursorKey('calls')),
  });

const syncChats = (now: number, mode: Mode) =>
  syncKind({
    now,
    backfillDays: Number(process.env.SYNC_BACKFILL_DAYS) || 30,
    maxPerRun: mode.maxPerRun,
    force: mode.force,
    list: listChats,
    fetchFull: getChat,
    idOf: (item) => item.chat_id,
    isFinal: (item) => FINAL_CHAT.has(item.chat_status),
    hasAnalysis: (item) => Boolean(item.chat_analysis?.chat_summary),
    find: (id) => findExisting(CHAT_KIND, id),
    save: saveChat,
    watermark: watermark(mode.cursorKey('chats')),
  });

// Pull side of the sync: webhooks are the fast path, this closes whatever they missed
// and loads history on first run. The outcome is stored so the Retell tab can show it.
export const runSync = async (trigger: 'schedule' | 'manual') => {
  const now = Date.now();
  await setLastRunAt(now);

  try {
    const calls = await syncCalls(now, NORMAL);
    const chats = await syncChats(now, NORMAL);
    // After the calls, so a do-not-call request is first attributed to its call rather than to the contact.
    const dnc = await reconcileDnc(now).catch((error) => ({ error: error instanceof Error ? error.message : String(error) }));

    await setLastSync({ at: now, trigger, ok: true, calls, chats, dnc });
    return { calls, chats, dnc };
  } catch (error) {
    await setLastSync({ at: now, trigger, ok: false, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
};

// Resync re-reads every call and chat of the last `days` days and rewrites the records, even
// those that already look complete. It has its own cursor, so the normal sync is untouched.
export const startResync = async (days: number): Promise<ResyncJob> => {
  const now = Date.now();
  const from = now - Math.max(1, Math.floor(days)) * DAY_MS;
  await kv.set(RESYNC.cursorKey('calls'), from);
  await kv.set(RESYNC.cursorKey('chats'), from);

  const empty = (): ResyncTotals => ({ created: 0, updated: 0, failed: 0, done: false });
  const job: ResyncJob = { startedAt: now, days, done: false, calls: empty(), chats: empty() };
  await setResyncJob(job);
  await setResyncBusyUntil(0);
  return job;
};

// One chunk of the running job. The cron tick calls this until the job reports done.
export const stepResync = async (): Promise<ResyncJob | null> => {
  const job = await getResyncJob();
  if (!job || job.done) return job;

  const now = Date.now();
  if (now < ((await getResyncBusyUntil()) ?? 0)) return job;
  await setResyncBusyUntil(now + BUSY_MS);

  try {
    const advance = async (kind: 'calls' | 'chats', run: () => Promise<SyncReport>) => {
      const totals = job[kind];
      if (totals.done) return;

      const before = (await kv.get<number>(RESYNC.cursorKey(kind))) ?? 0;
      const report = await run();
      totals.created += report.created;
      totals.updated += report.updated;
      totals.failed += report.failed;

      // A failure that stops the cursor would repeat forever: give up and show the error.
      const stuck = report.failed > 0 && report.watermark <= before;
      if (stuck) totals.error = report.error;
      totals.done = stuck || !report.hasMore;
    };

    await advance('calls', () => syncCalls(now, RESYNC));
    await advance('chats', () => syncChats(now, RESYNC));
  } catch (error) {
    job.calls.error ??= error instanceof Error ? error.message : String(error);
    job.calls.done = job.chats.done = true;
  }

  if (job.calls.done && job.chats.done) {
    job.done = true;
    job.finishedAt = Date.now();
  }
  await setResyncJob(job);
  await setResyncBusyUntil(0);
  return job;
};
