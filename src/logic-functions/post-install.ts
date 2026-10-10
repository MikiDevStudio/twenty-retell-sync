import { definePostInstallLogicFunction } from 'twenty-sdk/define';

import { POST_INSTALL_FN_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { ensureDashboard } from 'src/lib/dashboard';
import { dashboardDeps } from 'src/lib/dashboard-api';

// Puts "Retell Analytics" into the Dashboards list. Runs on upgrades too, so a workspace that had the
// app before this version gets the record; a second run finds it and does nothing.
export default definePostInstallLogicFunction({
  universalIdentifier: POST_INSTALL_FN_UNIVERSAL_IDENTIFIER,
  name: 'retell-post-install',
  description: 'Creates the Retell Analytics dashboard record in the Dashboards list',
  timeoutSeconds: 60,
  shouldRunOnVersionUpgrade: true,
  handler: async () => {
    await ensureDashboard(dashboardDeps());
  },
});
