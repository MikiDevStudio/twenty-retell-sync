import { describe, expect, it } from 'vitest';

import { planPhoneCall, planSmsChat, type CallPerson } from 'src/lib/outbound';
import { normalizeSettings } from 'src/lib/settings';

const person = (extra: Partial<CallPerson> = {}): CallPerson => ({
  id: 'person-1',
  phones: { primaryPhoneNumber: '5550001111', primaryPhoneCallingCode: '+1' },
  name: { firstName: 'Ada', lastName: 'Lovelace' },
  emails: { primaryEmail: 'ada@example.com' },
  company: { name: 'Example Inc' },
  ...extra,
});

const defaults = { fromNumber: '+15559990000', agentId: 'agent_default' };

describe('planPhoneCall', () => {
  it('builds the Retell request from the person and the defaults', () => {
    const plan = planPhoneCall(person(), { opportunityId: 'opp-1' }, defaults);
    expect(plan).toEqual({
      ok: true,
      request: {
        from_number: '+15559990000',
        to_number: '+15550001111',
        override_agent_id: 'agent_default',
        honor_internal_dnc: true,
        metadata: { twenty_person_id: 'person-1', opportunity_id: 'opp-1' },
        retell_llm_dynamic_variables: {
          first_name: 'Ada',
          last_name: 'Lovelace',
          full_name: 'Ada Lovelace',
          email: 'ada@example.com',
          company_name: 'Example Inc',
          twenty_person_id: 'person-1',
          opportunity_id: 'opp-1',
        },
      },
    });
  });

  it('lets the caller override the number, the agent and add variables, but not the ids', () => {
    const plan = planPhoneCall(
      person({ company: null, emails: null }),
      { fromNumber: '+15551112222', agentId: 'agent_x', variables: { topic: 'renewal', twenty_person_id: 'spoofed' } },
      defaults,
    );
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.request.from_number).toBe('+15551112222');
    expect(plan.request.override_agent_id).toBe('agent_x');
    expect(plan.request.retell_llm_dynamic_variables).toEqual({
      first_name: 'Ada',
      last_name: 'Lovelace',
      full_name: 'Ada Lovelace',
      topic: 'renewal',
      twenty_person_id: 'person-1',
    });
  });

  it('leaves the agent to the number when none is set anywhere', () => {
    const plan = planPhoneCall(person(), {}, { fromNumber: '+15559990000', agentId: '' });
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.request).not.toHaveProperty('override_agent_id');
  });

  it('refuses a do-not-call person, a person without a number and a missing from number', () => {
    expect(planPhoneCall(person({ retellDoNotCall: true }), {}, defaults)).toMatchObject({ ok: false });
    expect(planPhoneCall(person({ phones: { primaryPhoneNumber: '5550001111' } }), {}, defaults)).toMatchObject({ ok: false });
    expect(planPhoneCall(person(), {}, { fromNumber: '', agentId: '' })).toMatchObject({ ok: false });
    expect(planPhoneCall(person(), { fromNumber: '5551112222' }, defaults)).toMatchObject({ ok: false });
  });

  it('passes a valid idempotency key and refuses a malformed one', () => {
    const plan = planPhoneCall(person(), { idempotencyKey: 'lead-42-call' }, defaults);
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.request.idempotency_key).toBe('lead-42-call');
    expect(planPhoneCall(person(), { idempotencyKey: 'bad key!' }, defaults)).toMatchObject({ ok: false });
  });
});

describe('planSmsChat', () => {
  it('builds the same request without an idempotency key, which create-sms-chat does not take', () => {
    const plan = planSmsChat(person(), { idempotencyKey: 'lead-42-call', variables: { reason: 'follow-up' } }, defaults);
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.request).not.toHaveProperty('idempotency_key');
    expect(plan.request).toMatchObject({ to_number: '+15550001111', honor_internal_dnc: true, override_agent_id: 'agent_default' });
    expect(plan.request.retell_llm_dynamic_variables).toMatchObject({ reason: 'follow-up', first_name: 'Ada' });
  });

  it('refuses a do-not-call person and names the SMS setting when no number is set', () => {
    expect(planSmsChat(person({ retellDoNotCall: true }), {}, defaults)).toMatchObject({ ok: false });
    const plan = planSmsChat(person(), {}, { fromNumber: '', agentId: '' });
    expect(plan.ok ? '' : plan.reason).toContain('SMS number');
  });
});

describe('outbound settings', () => {
  it('keeps an E.164 default number and drops anything else', () => {
    expect(normalizeSettings({ outboundFromNumber: ' +15559990000 ' }).outboundFromNumber).toBe('+15559990000');
    expect(normalizeSettings({ outboundFromNumber: '5559990000' }).outboundFromNumber).toBe('');
    expect(normalizeSettings(null)).toMatchObject({ outboundFromNumber: '', outboundAgentId: '', smsFromNumber: '', smsAgentId: '' });
    expect(normalizeSettings({ smsFromNumber: '+15559990000' }).smsFromNumber).toBe('+15559990000');
  });
});
