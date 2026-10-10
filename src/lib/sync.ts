import type { Page } from 'src/lib/retell-api';
import type { Existing, UpsertResult } from 'src/lib/store';

type Json = Record<string, any>;

const DAY_MS = 24 * 60 * 60 * 1000;
const SETTLE_MS = 60 * 60 * 1000;
const PAGE_SIZE = 100;
const MAX_CONSECUTIVE_FAILURES = 3;

export type SyncDeps = {
  now: number;
  backfillDays: number;
  maxPerRun: number;
  force?: boolean; // resync: rewrite records that already look complete
  list: (params: { startMs: number; endMs: number; limit: number; paginationKey?: string }) => Promise<Page>;
  fetchFull: (id: string) => Promise<Json>;
  idOf: (item: Json) => string;
  isFinal: (item: Json) => boolean;
  hasAnalysis: (item: Json) => boolean;
  find: (id: string) => Promise<Existing | null>;
  save: (full: Json) => Promise<UpsertResult>;
  watermark: { get: () => Promise<number | null>; set: (value: number) => Promise<void> };
};

export type SyncReport = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  hasMore: boolean;
  watermark: number;
  error?: string; // first failure message, so a silent "3 failed" can be diagnosed
};

// An item is settled once nothing about it will change: it ended and either has its analysis or
// has waited long enough that none is coming. The watermark never moves past an unsettled item,
// so the next run looks at it again.
const isSettled = (deps: SyncDeps, item: Json): boolean =>
  deps.isFinal(item) &&
  (deps.hasAnalysis(item) || deps.now - (item.end_timestamp ?? item.start_timestamp ?? 0) > SETTLE_MS);

export const syncKind = async (deps: SyncDeps): Promise<SyncReport> => {
  const report: SyncReport = { created: 0, updated: 0, skipped: 0, failed: 0, hasMore: false, watermark: 0 };

  const start = (await deps.watermark.get()) ?? deps.now - deps.backfillDays * DAY_MS;
  let watermark = start;
  let blocked = false;
  let processed = 0;
  let consecutiveFailures = 0;
  let paginationKey: string | undefined;

  pages: while (true) {
    const page = await deps.list({ startMs: start, endMs: deps.now, limit: PAGE_SIZE, paginationKey });

    for (const item of page.items) {
      if (processed >= deps.maxPerRun) {
        report.hasMore = true;
        break pages;
      }

      const settled = isSettled(deps, item);
      const startedAt = item.start_timestamp ?? start;

      try {
        const existing = deps.force ? null : await deps.find(deps.idOf(item));
        const upToDate =
          existing && (existing.summary || (existing.endedAt && deps.now - Date.parse(existing.endedAt) > SETTLE_MS));

        if (upToDate) {
          report.skipped++;
        } else {
          const result = await deps.save(await deps.fetchFull(deps.idOf(item)));
          report[result]++;
          processed++;
        }
        consecutiveFailures = 0;
      } catch (error) {
        report.failed++;
        report.error ??= error instanceof Error ? error.message : String(error);
        blocked = true;
        if (++consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          report.hasMore = true;
          break pages;
        }
        continue;
      }

      if (!settled) blocked = true;
      if (!blocked) watermark = Math.max(watermark, startedAt);
    }

    if (!page.has_more || !page.pagination_key) break;
    paginationKey = page.pagination_key;
  }

  if (watermark > start) await deps.watermark.set(watermark);
  report.watermark = watermark;
  return report;
};
