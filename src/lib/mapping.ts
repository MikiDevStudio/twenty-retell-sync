import { buildTranscript } from 'src/lib/transcript';

// Retell call/chat -> data for the retellCall / retellChat objects.
// Fields named in SYNC_EXCLUDE_FIELDS are dropped, so they are never written or overwritten.

type Json = Record<string, unknown>;
type Retell = Record<string, any>;

const iso = (ms: unknown): string | null =>
  typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : null;

const upper = (value: unknown): string | null =>
  typeof value === 'string' && value ? value.toUpperCase() : null;

const sentiment = (value: unknown): string | null => upper(value);

const withoutExcluded = (data: Json, exclude: ReadonlySet<string>): Json =>
  Object.fromEntries(Object.entries(data).filter(([key]) => key === 'name' || !exclude.has(key)));

export const parseExcluded = (raw: string | undefined): Set<string> =>
  new Set(
    (raw ?? '')
      .split(',')
      .map((field) => field.trim())
      .filter((field) => field && field !== 'callId' && field !== 'chatId'),
  );

// An agent set to "Everything except PII" returns the PII-free copy under `scrubbed_<field>` and omits
// the original. Prefer the scrubbed copy: it is the version the account chose to keep.
const pick = (record: Retell, key: string): any => record[`scrubbed_${key}`] ?? record[key];

export const callPhone = (call: Retell): string | null =>
  (call.direction === 'outbound' ? call.to_number : call.from_number) ?? null;

// Only the link is kept, never the audio. Retell serves the file for as long as it retains it.
const recordingLink = (url: unknown): Json | null =>
  typeof url === 'string' && url ? { primaryLinkUrl: url, primaryLinkLabel: 'Recording' } : null;

// A name for a Person created from an unknown number: from the agent's dynamic variables when they hold one
// (PII-scrubbed placeholders like "[person name 1]" are not names), else the number itself.
const NAME_KEYS = { first: ['first_name', 'firstName', 'name', 'customer_name'], last: ['last_name', 'lastName'] };

const nameFrom = (source: Record<string, unknown> | undefined, keys: string[]): string => {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === 'string' && value.trim() && !value.includes('[')) return value.trim();
  }
  return '';
};

export const personName = (record: Retell, e164: string): { firstName: string; lastName: string } => {
  const variables = pick(record, 'retell_llm_dynamic_variables');
  const firstName = nameFrom(variables, NAME_KEYS.first);
  return firstName
    ? { firstName, lastName: nameFrom(variables, NAME_KEYS.last) }
    : { firstName: e164, lastName: '' };
};

// An agent started from a CRM opportunity can carry its id along; that is the one unambiguous way to link a
// call to an opportunity. Nothing is guessed from the person's other opportunities.
const OPPORTUNITY_KEYS = ['opportunity_id', 'twenty_opportunity_id'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const opportunityIdOf = (record: Retell): string | null => {
  const sources = [pick(record, 'metadata'), pick(record, 'retell_llm_dynamic_variables'), record.custom_attributes];
  for (const source of sources) {
    for (const key of OPPORTUNITY_KEYS) {
      const value = source?.[key];
      if (typeof value === 'string' && UUID.test(value.trim())) return value.trim().toLowerCase();
    }
  }
  return null;
};

export const mapCall = (call: Retell, exclude: ReadonlySet<string>): Json => {
  const analysis = pick(call, 'call_analysis') ?? {};
  const recordingUrl = pick(call, 'recording_url');
  const playable = exclude.has('recording') ? null : recordingUrl;
  const startedAt = iso(call.start_timestamp);

  return withoutExcluded(
    {
      name: [call.direction ?? call.call_type, callPhone(call), startedAt?.slice(0, 16).replace('T', ' ')]
        .filter(Boolean)
        .join(' · '),
      callId: call.call_id,
      agentId: call.agent_id ?? null,
      agentName: call.agent_name ?? null,
      direction: upper(call.direction),
      callType: call.call_type ?? null,
      callStatus: call.call_status ?? null,
      fromNumber: call.from_number ?? null,
      toNumber: call.to_number ?? null,
      startedAt,
      endedAt: iso(call.end_timestamp),
      durationMs: call.duration_ms ?? null,
      disconnectionReason: call.disconnection_reason ?? null,
      summary: analysis.call_summary ?? null,
      sentiment: sentiment(analysis.user_sentiment),
      successful: analysis.call_successful ?? null,
      inVoicemail: analysis.in_voicemail ?? null,
      transcript: buildTranscript(call, playable),
      recording: exclude.has('recording') ? null : recordingLink(recordingUrl),
      analysis: analysis.custom_analysis_data ?? null,
      dynamicVariables: pick(call, 'retell_llm_dynamic_variables') ?? null,
      metadata: pick(call, 'metadata') ?? null,
      costCents: call.call_cost?.combined_cost ?? null,
    },
    exclude,
  );
};

const PHONE_KEYS = ['user_number', 'phone_number', 'phone', 'from_number', 'customer_number'];

// Chat objects carry no phone field in the Retell docs; look in the places an agent can put one.
export const chatPhone = (chat: Retell): string | null => {
  for (const source of [chat.metadata, chat.retell_llm_dynamic_variables, chat.custom_attributes]) {
    for (const key of PHONE_KEYS) {
      const value = source?.[key];
      if (typeof value === 'string' && value.startsWith('+')) return value;
    }
  }
  return null;
};

// Retell gives chats no duration field; it is the span between the first and the last message.
const chatDuration = (chat: Retell): number | null =>
  typeof chat.start_timestamp === 'number' && typeof chat.end_timestamp === 'number' && chat.end_timestamp >= chat.start_timestamp
    ? chat.end_timestamp - chat.start_timestamp
    : null;

export const mapChat = (chat: Retell, exclude: ReadonlySet<string>): Json => {
  const analysis = pick(chat, 'chat_analysis') ?? {};
  const startedAt = iso(chat.start_timestamp);
  const userNumber = chatPhone(chat);

  return withoutExcluded(
    {
      name: [chat.chat_type ?? 'chat', userNumber, startedAt?.slice(0, 16).replace('T', ' ')]
        .filter(Boolean)
        .join(' · '),
      chatId: chat.chat_id,
      agentId: chat.agent_id ?? null,
      agentName: chat.agent_name ?? null,
      chatType: chat.chat_type ?? null,
      chatStatus: chat.chat_status ?? null,
      userNumber,
      startedAt,
      endedAt: iso(chat.end_timestamp),
      durationMs: chatDuration(chat),
      summary: analysis.chat_summary ?? null,
      sentiment: sentiment(analysis.user_sentiment),
      successful: analysis.chat_successful ?? null,
      transcript: buildTranscript(chat),
      analysis: analysis.custom_analysis_data ?? null,
      dynamicVariables: pick(chat, 'retell_llm_dynamic_variables') ?? null,
      metadata: pick(chat, 'metadata') ?? null,
      costCents: chat.chat_cost?.combined_cost ?? null,
    },
    exclude,
  );
};
