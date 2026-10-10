import { defineLogicFunction } from 'twenty-sdk/define';

import { SYNC_FN_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { runSync } from 'src/lib/run-sync';

// On-demand pull sync (the "Sync now" button calls this). The scheduled one is sync-retell-cron.ts.
export default defineLogicFunction({
  universalIdentifier: SYNC_FN_UNIVERSAL_IDENTIFIER,
  name: 'sync-retell',
  description: 'Pulls Retell calls and chats into Twenty on demand',
  timeoutSeconds: 300,
  handler: () => runSync('manual'),
  httpRouteTriggerSettings: { path: '/retell/sync', httpMethod: 'POST', isAuthRequired: true },
});
