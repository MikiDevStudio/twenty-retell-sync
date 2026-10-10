import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';

import { ANALYTICS_LAYOUT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import type { DashboardDeps } from 'src/lib/dashboard';

// The only file that talks to Twenty for the dashboard record; the decisions are in dashboard.ts.
export const dashboardDeps = (): DashboardDeps => {
  const core: any = new CoreApiClient();
  const metadata: any = new MetadataApiClient();

  return {
    findLayoutId: async () => {
      const result = await metadata.query({ getPageLayouts: { id: true, universalIdentifier: true } });
      const layouts: { id: string; universalIdentifier: string }[] = result.getPageLayouts ?? [];
      return layouts.find((layout) => layout.universalIdentifier === ANALYTICS_LAYOUT_UNIVERSAL_IDENTIFIER)?.id ?? null;
    },
    findDashboardIds: async (layoutId) => {
      const result = await core.query({
        dashboards: { __args: { filter: { pageLayoutId: { eq: layoutId } }, first: 20 }, edges: { node: { id: true } } },
      });
      return result.dashboards.edges.map((edge: { node: { id: string } }) => edge.node.id);
    },
    createDashboard: async (title, pageLayoutId) => {
      await core.mutation({ createDashboard: { __args: { data: { title, pageLayoutId } }, id: true } });
    },
    deleteDashboard: async (id) => {
      await core.mutation({ deleteDashboard: { __args: { id }, id: true } });
    },
  };
};
