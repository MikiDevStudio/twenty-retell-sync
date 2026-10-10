import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { RESYNC_FN_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { startResync, stepResync } from 'src/lib/run-sync';

const MAX_DAYS = 3650;

// The "Resync" button: re-read Retell history for the last N days and rewrite the records.
// The first chunk runs here; the cron tick finishes the rest.
const handler = async (route: RoutePayload<{ days?: number }>) => {
  const days = Math.floor(Number(route.body?.days));
  if (!Number.isFinite(days) || days < 1 || days > MAX_DAYS) {
    throw new Error(`days must be a whole number from 1 to ${MAX_DAYS}`);
  }

  await startResync(days);
  return { job: await stepResync() };
};

export default defineLogicFunction({
  universalIdentifier: RESYNC_FN_UNIVERSAL_IDENTIFIER,
  name: 'retell-resync',
  description: 'Re-reads Retell calls and chats for a chosen period and rewrites the Twenty records',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: { path: '/retell/resync', httpMethod: 'POST', isAuthRequired: true },
});
