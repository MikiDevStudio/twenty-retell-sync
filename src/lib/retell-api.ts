const BASE_URL = 'https://api.retellai.com';

type Json = Record<string, any>;

export class RetellApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'RetellApiError';
  }

  // 429 and 5xx are worth retrying; 4xx (bad key, bad request) are not.
  get isTransient(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

const request = async (path: string, init?: RequestInit): Promise<Json> => {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) throw new RetellApiError(401, 'RETELL_API_KEY is not set');

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    // Retell explains a rejected request in the body (a do-not-call number, an unknown from_number); keep it short.
    const detail = (await response.text().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 300);
    throw new RetellApiError(response.status, `Retell ${path} failed with ${response.status}${detail ? `: ${detail}` : ''}`);
  }

  return (await response.json()) as Json;
};

export type Page = { items: Json[]; has_more: boolean; pagination_key?: string };

type ListParams = { startMs: number; endMs: number; limit: number; paginationKey?: string };

const listBody = ({ startMs, endMs, limit, paginationKey }: ListParams): string =>
  JSON.stringify({
    filter_criteria: { start_timestamp: { type: 'range', op: 'bt', value: [startMs, endMs] } },
    sort_order: 'ascending',
    limit,
    ...(paginationKey ? { pagination_key: paginationKey } : {}),
  });

// v3 list endpoints omit the transcript; use getCall / getChat for the full record.
export const listCalls = (params: ListParams): Promise<Page> =>
  request('/v3/list-calls', { method: 'POST', body: listBody(params) }) as Promise<Page>;

export const listChats = (params: ListParams): Promise<Page> =>
  request('/v3/list-chats', { method: 'POST', body: listBody(params) }) as Promise<Page>;

export const getCall = (callId: string): Promise<Json> =>
  request(`/v2/get-call/${encodeURIComponent(callId)}`);

export const getChat = (chatId: string): Promise<Json> =>
  request(`/get-chat/${encodeURIComponent(chatId)}`);

export type Agent = {
  agent_id: string;
  agent_name?: string;
  channel: 'voice' | 'chat';
  webhook_url?: string | null;
};

export const listAgents = async (): Promise<Agent[]> => {
  const agents: Agent[] = [];
  let paginationKey: string | undefined;

  do {
    const page = (await request('/v2/list-agents', {
      method: 'POST',
      body: JSON.stringify({ limit: 100, ...(paginationKey ? { pagination_key: paginationKey } : {}) }),
    })) as Page & { items: Agent[] };
    agents.push(...page.items);
    paginationKey = page.has_more ? page.pagination_key : undefined;
  } while (paginationKey);

  return agents;
};

// list-agents does not return webhook_url, only the per-agent GET does (checked 2026-10-09).
export const getAgentWebhook = async (agent: Agent): Promise<string | null> => {
  const route = agent.channel === 'chat' ? 'get-chat-agent' : 'get-agent';
  const detail = await request(`/${route}/${encodeURIComponent(agent.agent_id)}`);
  return detail.webhook_url ?? null;
};

// Only the ended/analyzed events carry what this app stores; started/transcript events would just add noise.
const WEBHOOK_EVENTS = {
  voice: ['call_ended', 'call_analyzed'],
  chat: ['chat_ended', 'chat_analyzed'],
};

// url = null removes the agent-level webhook (the agent then falls back to the account-level one).
export const setAgentWebhook = async (agent: Agent, url: string | null): Promise<void> => {
  const route = agent.channel === 'chat' ? 'update-chat-agent' : 'update-agent';
  await request(`/${route}/${encodeURIComponent(agent.agent_id)}`, {
    method: 'PATCH',
    body: JSON.stringify(
      url ? { webhook_url: url, webhook_events: WEBHOOK_EVENTS[agent.channel] } : { webhook_url: null },
    ),
  });
};

// Contacts: one per phone number, holding the do-not-call flag (docs checked 2026-10-10).
export type Contact = { contact_id: string; phone_number: string; do_not_call?: boolean; user_modified_timestamp?: number };

// Every contact marked do-not-call. The list has no "changed since" filter, so it is read in full each time.
export const listDncContacts = async (): Promise<Contact[]> => {
  const contacts: Contact[] = [];
  let paginationKey: string | undefined;

  do {
    const page = (await request('/list-contacts', {
      method: 'POST',
      body: JSON.stringify({
        limit: 1000,
        filter_criteria: { do_not_call: { type: 'boolean', op: 'eq', value: true } },
        ...(paginationKey ? { pagination_key: paginationKey } : {}),
      }),
    })) as Page & { items: Contact[] };
    contacts.push(...page.items);
    paginationKey = page.has_more ? page.pagination_key : undefined;
  } while (paginationKey);

  return contacts;
};

// null when Retell has no contact for the number yet.
export const getContactByPhone = async (e164: string): Promise<Contact | null> => {
  try {
    return (await request(`/get-contact-by-phone/${encodeURIComponent(e164)}`)) as Contact;
  } catch (error) {
    if (error instanceof RetellApiError && error.status === 404) return null;
    throw error;
  }
};

// Sets the flag on the number's contact, creating the contact when there is none and the flag is being set.
export const setContactDnc = async (e164: string, value: boolean): Promise<Contact | null> => {
  const contact = await getContactByPhone(e164);
  if (!contact) {
    if (!value) return null;
    return (await request('/create-contact', {
      method: 'POST',
      body: JSON.stringify({ phone_number: e164, do_not_call: true }),
    })) as Contact;
  }
  if (contact.do_not_call === value) return contact;
  return (await request(`/update-contact/${encodeURIComponent(contact.contact_id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ do_not_call: value }),
  })) as Contact;
};

// Numbers owned in Retell; an outbound call must start from one of them (docs checked 2026-10-10).
export type PhoneNumber = {
  phone_number: string;
  nickname?: string | null;
  outbound_agents?: { agent_id: string; weight: number }[] | null;
  outbound_sms_agents?: { agent_id: string; weight: number }[] | null;
};

export const listPhoneNumbers = async (): Promise<PhoneNumber[]> => {
  const numbers: PhoneNumber[] = [];
  let paginationKey: string | undefined;

  do {
    const query = `limit=1000${paginationKey ? `&pagination_key=${encodeURIComponent(paginationKey)}` : ''}`;
    const page = (await request(`/v2/list-phone-numbers?${query}`)) as Page & { items: PhoneNumber[] };
    numbers.push(...page.items);
    paginationKey = page.has_more ? page.pagination_key : undefined;
  } while (paginationKey);

  return numbers;
};

// Places a real outbound call: Retell starts dialing as soon as this returns.
export const createPhoneCall = (body: Json): Promise<Json> =>
  request('/v2/create-phone-call', { method: 'POST', body: JSON.stringify(body) });

// Starts an SMS conversation: the chat agent writes and sends the first message itself (no text is passed in).
export const createSmsChat = (body: Json): Promise<Json> =>
  request('/create-sms-chat', { method: 'POST', body: JSON.stringify(body) });

// Cheapest authenticated call, used by the health check.
export const ping = async (): Promise<void> => {
  await request('/v3/list-calls', { method: 'POST', body: JSON.stringify({ limit: 1 }) });
};
