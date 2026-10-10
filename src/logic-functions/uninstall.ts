import { defineUninstallLogicFunction } from 'twenty-sdk/define';

import { UNINSTALL_FN_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { removeDashboards } from 'src/lib/dashboard';
import { dashboardDeps } from 'src/lib/dashboard-api';

// The dashboard record is not part of the manifest, so the uninstall does not remove it by itself.
export default defineUninstallLogicFunction({
  universalIdentifier: UNINSTALL_FN_UNIVERSAL_IDENTIFIER,
  name: 'retell-uninstall',
  description: 'Removes the Retell Analytics dashboard record from the Dashboards list',
  timeoutSeconds: 60,
  handler: async () => {
    await removeDashboards(dashboardDeps());
  },
});
