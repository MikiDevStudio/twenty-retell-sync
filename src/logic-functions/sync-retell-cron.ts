import { defineLogicFunction } from 'twenty-sdk/define';

import { SYNC_CRON_FN_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { runSync, stepResync } from 'src/lib/run-sync';
import { isSyncDue } from 'src/lib/settings';
import { getLastRunAt, getSettings } from 'src/lib/settings-store';

// A cron pattern is fixed at deploy time, so this ticks every 5 minutes and the interval
// chosen on the Retell tab decides whether a tick does any work.
const handler = async () => {
  if (!process.env.RETELL_API_KEY) return { skipped: 'no RETELL_API_KEY' };

  // A running resync advances on every tick, whatever the sync interval is.
  await stepResync();

  const { intervalMinutes } = await getSettings();
  if (!isSyncDue(await getLastRunAt(), Date.now(), intervalMinutes)) return { skipped: 'not due' };

  return runSync('schedule');
};

export default defineLogicFunction({
  universalIdentifier: SYNC_CRON_FN_UNIVERSAL_IDENTIFIER,
  name: 'sync-retell-cron',
  description: 'Scheduled pull sync; honours the interval set on the Retell tab',
  timeoutSeconds: 300,
  handler,
  cronTriggerSettings: { pattern: '*/5 * * * *' },
});
