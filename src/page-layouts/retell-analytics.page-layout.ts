import {
  AggregateOperations,
  definePageLayout,
  getFieldUniversalIdentifier,
  ObjectRecordGroupByDateGranularity,
  PageLayoutTabLayoutMode,
  type PageLayoutWidgetManifest,
} from 'twenty-sdk/define';

import {
  ANALYTICS_CALLS_TAB_UNIVERSAL_IDENTIFIER,
  ANALYTICS_CHATS_TAB_UNIVERSAL_IDENTIFIER,
  ANALYTICS_LAYOUT_UNIVERSAL_IDENTIFIER,
  ANALYTICS_WIDGET_IDS as W,
  APPLICATION_UNIVERSAL_IDENTIFIER,
  CALL_FIELD_IDS as CALL_F,
  CALL_OBJECT_UNIVERSAL_IDENTIFIER,
  CHAT_FIELD_IDS as CHAT_F,
  CHAT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

// Every widget shows the same window, so the page reads as one period. The widgets of an app are not
// editable in the UI (not verified), hence one constant here.
const PERIOD_DAYS = 30;

type Cell = { row: number; column: number; rowSpan: number; columnSpan: number };
type TileOptions = {
  prefix?: string;
  suffix?: string;
  ratioAggregateConfig?: { fieldMetadataUniversalIdentifier: string; optionValue: string };
};

const at = (cell: Cell) => ({ layoutMode: PageLayoutTabLayoutMode.GRID as const, ...cell });

// Charts for one object. `id` is the system id field, the field COUNT runs over; `startedAt` is the date
// every widget is limited by.
const chartsFor = (objectUniversalIdentifier: string, startedAt: string) => {
  const id = getFieldUniversalIdentifier({
    applicationUniversalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
    objectUniversalIdentifier,
    name: 'id',
  });
  const filter = {
    recordFilters: [
      {
        fieldMetadataUniversalIdentifier: startedAt,
        operand: 'IS_RELATIVE',
        value: `PAST_${PERIOD_DAYS}_DAY`,
        type: 'DATE_TIME',
      },
    ],
  };
  const widget = (
    universalIdentifier: string,
    title: string,
    cell: Cell,
    configuration: PageLayoutWidgetManifest['configuration'],
  ): PageLayoutWidgetManifest => ({
    universalIdentifier,
    title,
    type: 'GRAPH',
    objectUniversalIdentifier,
    position: at(cell),
    configuration: { ...configuration, filter } as PageLayoutWidgetManifest['configuration'],
  });

  return {
    count: (uid: string, title: string, cell: Cell, options: TileOptions = {}) =>
      widget(uid, title, cell, {
        configurationType: 'AGGREGATE_CHART',
        aggregateFieldMetadataUniversalIdentifier: id,
        aggregateOperation: AggregateOperations.COUNT,
        ...options,
      }),
    tile: (uid: string, title: string, cell: Cell, field: string, operation: AggregateOperations, options: TileOptions = {}) =>
      widget(uid, title, cell, {
        configurationType: 'AGGREGATE_CHART',
        aggregateFieldMetadataUniversalIdentifier: field,
        aggregateOperation: operation,
        ...options,
      }),
    pie: (uid: string, title: string, cell: Cell, groupBy: string) =>
      widget(uid, title, cell, {
        configurationType: 'PIE_CHART',
        aggregateFieldMetadataUniversalIdentifier: id,
        aggregateOperation: AggregateOperations.COUNT,
        groupByFieldMetadataUniversalIdentifier: groupBy,
        displayLegend: true,
      }),
    perDay: (uid: string, title: string, cell: Cell) =>
      widget(uid, title, cell, {
        configurationType: 'LINE_CHART',
        aggregateFieldMetadataUniversalIdentifier: id,
        aggregateOperation: AggregateOperations.COUNT,
        primaryAxisGroupByFieldMetadataUniversalIdentifier: startedAt,
        primaryAxisDateGranularity: ObjectRecordGroupByDateGranularity.DAY,
      }),
    stackedByDay: (uid: string, title: string, cell: Cell, splitBy: string) =>
      widget(uid, title, cell, {
        configurationType: 'BAR_CHART',
        aggregateFieldMetadataUniversalIdentifier: id,
        aggregateOperation: AggregateOperations.COUNT,
        primaryAxisGroupByFieldMetadataUniversalIdentifier: startedAt,
        primaryAxisDateGranularity: ObjectRecordGroupByDateGranularity.DAY,
        secondaryAxisGroupByFieldMetadataUniversalIdentifier: splitBy,
        groupMode: 'STACKED',
        layout: 'VERTICAL',
        displayLegend: true,
      }),
    bar: (uid: string, title: string, cell: Cell, groupBy: string) =>
      widget(uid, title, cell, {
        configurationType: 'BAR_CHART',
        aggregateFieldMetadataUniversalIdentifier: id,
        aggregateOperation: AggregateOperations.COUNT,
        primaryAxisGroupByFieldMetadataUniversalIdentifier: groupBy,
        layout: 'VERTICAL',
        omitNullValues: true,
      }),
  };
};

const calls = chartsFor(CALL_OBJECT_UNIVERSAL_IDENTIFIER, CALL_F.startedAt);
const chats = chartsFor(CHAT_OBJECT_UNIVERSAL_IDENTIFIER, CHAT_F.startedAt);

const callWidgets: PageLayoutWidgetManifest[] = [
  calls.count(W.callsCount, 'Calls', { row: 0, column: 0, rowSpan: 3, columnSpan: 3 }),
  calls.tile(W.callsAvgDuration, 'Avg duration', { row: 0, column: 3, rowSpan: 3, columnSpan: 3 }, CALL_F.durationSeconds, AggregateOperations.AVG, { suffix: ' s' }),
  calls.tile(W.callsLatencyP50, 'Latency p50', { row: 0, column: 6, rowSpan: 3, columnSpan: 3 }, CALL_F.latencyP50Ms, AggregateOperations.AVG, { suffix: ' ms' }),
  calls.tile(W.callsTotalCost, 'Total cost', { row: 0, column: 9, rowSpan: 3, columnSpan: 3 }, CALL_F.costDollars, AggregateOperations.SUM, { prefix: '$' }),

  calls.count(W.callsPickedUpRate, 'Picked up rate', { row: 3, column: 0, rowSpan: 3, columnSpan: 4 }, {
    ratioAggregateConfig: { fieldMetadataUniversalIdentifier: CALL_F.connection, optionValue: 'CONNECTED' },
  }),
  calls.tile(W.callsTransferred, 'Transferred', { row: 3, column: 4, rowSpan: 3, columnSpan: 4 }, CALL_F.transferred, AggregateOperations.COUNT_TRUE),
  calls.tile(W.callsVoicemail, 'Voicemail', { row: 3, column: 8, rowSpan: 3, columnSpan: 4 }, CALL_F.inVoicemail, AggregateOperations.COUNT_TRUE),

  calls.perDay(W.callsPerDay, 'Calls per day', { row: 6, column: 0, rowSpan: 6, columnSpan: 6 }),
  calls.stackedByDay(W.callsConnectionByDay, 'Calls per day by connection', { row: 6, column: 6, rowSpan: 6, columnSpan: 6 }, CALL_F.connection),

  calls.pie(W.callsSuccessful, 'Successful', { row: 12, column: 0, rowSpan: 6, columnSpan: 4 }, CALL_F.successful),
  calls.pie(W.callsSentiment, 'User sentiment', { row: 12, column: 4, rowSpan: 6, columnSpan: 4 }, CALL_F.sentiment),
  calls.pie(W.callsDirection, 'Inbound / outbound', { row: 12, column: 8, rowSpan: 6, columnSpan: 4 }, CALL_F.direction),

  calls.bar(W.callsDisconnectionReason, 'Disconnection reason', { row: 18, column: 0, rowSpan: 6, columnSpan: 12 }, CALL_F.disconnectionReason),
];

const chatWidgets: PageLayoutWidgetManifest[] = [
  chats.count(W.chatsCount, 'Chats', { row: 0, column: 0, rowSpan: 3, columnSpan: 4 }),
  chats.tile(W.chatsAvgDuration, 'Avg duration', { row: 0, column: 4, rowSpan: 3, columnSpan: 4 }, CHAT_F.durationSeconds, AggregateOperations.AVG, { suffix: ' s' }),
  chats.tile(W.chatsTotalCost, 'Total cost', { row: 0, column: 8, rowSpan: 3, columnSpan: 4 }, CHAT_F.costDollars, AggregateOperations.SUM, { prefix: '$' }),

  chats.perDay(W.chatsPerDay, 'Chats per day', { row: 3, column: 0, rowSpan: 6, columnSpan: 12 }),

  chats.pie(W.chatsSuccessful, 'Successful', { row: 9, column: 0, rowSpan: 6, columnSpan: 6 }, CHAT_F.successful),
  chats.pie(W.chatsSentiment, 'User sentiment', { row: 9, column: 6, rowSpan: 6, columnSpan: 6 }, CHAT_F.sentiment),
];

export default definePageLayout({
  universalIdentifier: ANALYTICS_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Retell Analytics',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: ANALYTICS_CALLS_TAB_UNIVERSAL_IDENTIFIER,
      title: 'Calls',
      position: 0,
      icon: 'IconPhoneCall',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: callWidgets,
    },
    {
      universalIdentifier: ANALYTICS_CHATS_TAB_UNIVERSAL_IDENTIFIER,
      title: 'Chats',
      position: 1,
      icon: 'IconMessageCircle',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: chatWidgets,
    },
  ],
});
