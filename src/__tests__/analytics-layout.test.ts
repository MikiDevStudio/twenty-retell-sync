import { describe, expect, it } from 'vitest';

import { CALL_FIELD_IDS, CHAT_FIELD_IDS } from 'src/constants/universal-identifiers';
import layout from 'src/page-layouts/retell-analytics.page-layout';

const tabs = layout.config.tabs ?? [];
const widgets = tabs.flatMap((tab) => tab.widgets ?? []);

describe('Retell Analytics page layout', () => {
  it('passes the SDK validation', () => {
    expect(layout.errors).toEqual([]);
    expect(layout.success).toBe(true);
  });

  it('is a dashboard layout with a Calls tab and a Chats tab that name the period', () => {
    expect(layout.config.type).toBe('DASHBOARD');
    expect(layout.config.objectUniversalIdentifier).toBe('20202020-3840-4b6d-9425-0c5188b05ca8');
    expect(tabs.map((tab) => tab.title)).toEqual(['Calls · last 30 days', 'Chats · last 30 days']);
  });

  it('gives every entity its own universal identifier', () => {
    const ids = [layout.config.universalIdentifier, ...tabs.map((t) => t.universalIdentifier), ...widgets.map((w) => w.universalIdentifier)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every widget inside the 12-column grid and not overlapping its neighbours', () => {
    for (const tab of tabs) {
      const cells = (tab.widgets ?? []).map((w) => w.position as { row: number; column: number; rowSpan: number; columnSpan: number });
      for (const cell of cells) {
        expect(cell.column).toBeGreaterThanOrEqual(0);
        expect(cell.column + cell.columnSpan).toBeLessThanOrEqual(12);
      }
      for (const [i, a] of cells.entries()) {
        for (const b of cells.slice(i + 1)) {
          const apart =
            a.column + a.columnSpan <= b.column || b.column + b.columnSpan <= a.column ||
            a.row + a.rowSpan <= b.row || b.row + b.rowSpan <= a.row;
          expect(apart, `${tab.title}: widgets overlap`).toBe(true);
        }
      }
    }
  });

  it('has 13 widgets on Calls and 6 on Chats', () => {
    expect(tabs[0]?.widgets).toHaveLength(13);
    expect(tabs[1]?.widgets).toHaveLength(6);
  });

  it('limits every widget to the last 30 days of its own startedAt, so the page shows one period', () => {
    for (const widget of widgets) {
      const filters = (widget.configuration as { filter?: { recordFilters?: Record<string, unknown>[] } }).filter?.recordFilters;
      expect(filters, widget.title).toHaveLength(1);
      expect(filters?.[0]).toMatchObject({ operand: 'IS_RELATIVE', value: 'PAST_30_DAY', type: 'DATE_TIME' });
    }
  });

  it('gives every bar chart an orientation, which the server rejects without', () => {
    for (const widget of widgets) {
      const configuration = widget.configuration as { configurationType: string; layout?: string };
      if (configuration.configurationType === 'BAR_CHART') expect(configuration.layout, widget.title).toBe('VERTICAL');
    }
  });
});

describe('Retell Analytics units', () => {
  it('charts seconds and dollars, never the raw milliseconds or cents', () => {
    const raw = [CALL_FIELD_IDS.durationMs, CALL_FIELD_IDS.costCents, CHAT_FIELD_IDS.durationMs, CHAT_FIELD_IDS.costCents];
    for (const widget of widgets) {
      const field = (widget.configuration as { aggregateFieldMetadataUniversalIdentifier?: string }).aggregateFieldMetadataUniversalIdentifier;
      expect(raw, widget.title).not.toContain(field);
    }
  });
});
