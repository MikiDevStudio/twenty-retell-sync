import { describe, expect, it } from 'vitest';

import { DASHBOARD_TITLE, ensureDashboard, removeDashboards, type DashboardDeps } from 'src/lib/dashboard';

const world = (layoutId: string | null, existing: string[] = []) => {
  const created: { title: string; pageLayoutId: string }[] = [];
  const deleted: string[] = [];
  const deps: DashboardDeps = {
    findLayoutId: async () => layoutId,
    findDashboardIds: async () => existing,
    createDashboard: async (title, pageLayoutId) => {
      created.push({ title, pageLayoutId });
    },
    deleteDashboard: async (id) => {
      deleted.push(id);
    },
  };
  return { deps, created, deleted };
};

describe('ensureDashboard', () => {
  it('creates one dashboard on the app layout when there is none', async () => {
    const { deps, created } = world('layout-1');
    expect(await ensureDashboard(deps)).toBe('created');
    expect(created).toEqual([{ title: DASHBOARD_TITLE, pageLayoutId: 'layout-1' }]);
  });

  it('does not create a second one on a re-install or an upgrade', async () => {
    const { deps, created } = world('layout-1', ['dash-1']);
    expect(await ensureDashboard(deps)).toBe('exists');
    expect(created).toEqual([]);
  });

  it('fails when the layout is not installed yet, so the install hook is retried', async () => {
    const { deps, created } = world(null);
    await expect(ensureDashboard(deps)).rejects.toThrow(/page layout/);
    expect(created).toEqual([]);
  });
});

describe('removeDashboards', () => {
  it('deletes every dashboard that shows the app layout and reports how many', async () => {
    const { deps, deleted } = world('layout-1', ['dash-1', 'dash-2']);
    expect(await removeDashboards(deps)).toBe(2);
    expect(deleted).toEqual(['dash-1', 'dash-2']);
  });

  it('does nothing when the layout is already gone', async () => {
    const { deps, deleted } = world(null, ['dash-1']);
    expect(await removeDashboards(deps)).toBe(0);
    expect(deleted).toEqual([]);
  });
});
