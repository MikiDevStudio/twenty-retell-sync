// Pure decisions for an outbound call placed from Twenty. The Retell request and the Twenty reads live elsewhere.
import { e164Of, type DncPerson } from 'src/lib/dnc';
import { isE164 } from 'src/lib/settings';

export type CallPerson = DncPerson & {
  name?: { firstName?: string | null; lastName?: string | null } | null;
  emails?: { primaryEmail?: string | null } | null;
  company?: { name?: string | null } | null;
};

export type CallInput = {
  fromNumber?: string | null;
  agentId?: string | null;
  opportunityId?: string | null;
  variables?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
};

export type CallDefaults = { fromNumber: string; agentId: string };

export type CallPlan = { ok: true; request: Record<string, unknown> } | { ok: false; reason: string };

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{5,255}$/;

// Retell dynamic variables are strings only; empty values are left out so the agent prompt keeps its own fallback.
const stringVariables = (values: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : JSON.stringify(value)]),
  );

export type Channel = 'call' | 'sms';

const WORDS = { call: { noun: 'call', verb: 'call', setting: 'outbound number' }, sms: { noun: 'SMS', verb: 'text', setting: 'SMS number' } };

// One request shape serves create-phone-call and create-sms-chat; only a call takes an idempotency key.
export const planOutbound = (channel: Channel, person: CallPerson, input: CallInput, defaults: CallDefaults): CallPlan => {
  const words = WORDS[channel];
  // Do-not-call covers texts too: Retell's own honor_internal_dnc refuses both.
  if (person.retellDoNotCall) return { ok: false, reason: `This person is marked do-not-call; no ${words.noun} was sent.` };

  // The same number the do-not-call mirror uses, so a flag set on Retell's contact matches it.
  const toNumber = e164Of(person.phones);
  if (!toNumber || !isE164(toNumber)) return { ok: false, reason: 'This person has no primary phone number with a country code.' };

  const fromNumber = (input.fromNumber ?? '').trim() || defaults.fromNumber;
  if (!fromNumber) {
    return { ok: false, reason: `No number to ${words.verb} from: pass fromNumber or set the default ${words.setting} on the Retell tab.` };
  }
  if (!isE164(fromNumber)) return { ok: false, reason: `fromNumber ${fromNumber} is not in E.164 format (+15551234567).` };

  const agentId = (input.agentId ?? '').trim() || defaults.agentId;
  const opportunityId = (input.opportunityId ?? '').trim() || null;
  const idempotencyKey = channel === 'call' ? (input.idempotencyKey ?? '').trim() : '';
  if (idempotencyKey && !IDEMPOTENCY_KEY.test(idempotencyKey)) {
    return { ok: false, reason: 'idempotencyKey must be 5-255 characters of letters, digits, _ or -.' };
  }

  const firstName = person.name?.firstName?.trim() ?? '';
  const lastName = person.name?.lastName?.trim() ?? '';
  const ids = { twenty_person_id: person.id, ...(opportunityId ? { opportunity_id: opportunityId } : {}) };

  return {
    ok: true,
    request: {
      from_number: fromNumber,
      to_number: toNumber,
      ...(agentId ? { override_agent_id: agentId } : {}),
      // Retell refuses it too when its own contact for the number is do-not-call.
      honor_internal_dnc: true,
      ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      // opportunity_id in metadata links the finished call or chat to that opportunity (see opportunityIdOf).
      metadata: ids,
      retell_llm_dynamic_variables: stringVariables({
        first_name: firstName,
        last_name: lastName,
        full_name: [firstName, lastName].filter(Boolean).join(' '),
        email: person.emails?.primaryEmail,
        company_name: person.company?.name,
        ...(input.variables ?? {}),
        ...ids,
      }),
    },
  };
};

export const planPhoneCall = (person: CallPerson, input: CallInput, defaults: CallDefaults): CallPlan =>
  planOutbound('call', person, input, defaults);

export const planSmsChat = (person: CallPerson, input: CallInput, defaults: CallDefaults): CallPlan =>
  planOutbound('sms', person, input, defaults);
