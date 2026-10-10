// The Retell Analytics dashboard record. A manifest cannot create records, and the Dashboards list shows records of
// the `dashboard` object, so the install hook creates one that points at the app's DASHBOARD page layout.

export const DASHBOARD_TITLE = 'Retell Analytics';

export type DashboardDeps = {
  // Server id of this app's DASHBOARD page layout, null while it is not installed.
  findLayoutId: () => Promise<string | null>;
  // Dashboard records that show the given layout.
  findDashboardIds: (layoutId: string) => Promise<string[]>;
  createDashboard: (title: string, pageLayoutId: string) => Promise<void>;
  deleteDashboard: (id: string) => Promise<void>;
};

// Safe to run twice: an upgrade or a retried post-install finds the record and leaves it alone.
export const ensureDashboard = async (deps: DashboardDeps): Promise<'created' | 'exists'> => {
  const layoutId = await deps.findLayoutId();
  if (!layoutId) throw new Error('The Retell Analytics page layout is not installed yet');
  if ((await deps.findDashboardIds(layoutId)).length > 0) return 'exists';
  await deps.createDashboard(DASHBOARD_TITLE, layoutId);
  return 'created';
};

// On uninstall the layout goes away; a record that still points at it would be left broken in the list.
export const removeDashboards = async (deps: DashboardDeps): Promise<number> => {
  const layoutId = await deps.findLayoutId();
  if (!layoutId) return 0;
  const ids = await deps.findDashboardIds(layoutId);
  for (const id of ids) await deps.deleteDashboard(id);
  return ids.length;
};
