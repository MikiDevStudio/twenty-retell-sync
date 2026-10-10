import { createHmac } from 'node:crypto';

import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

// Synthetic data only: 555-01xx numbers are reserved for fiction.
const TEST_KEY = 'integration-test-key';
const WEBHOOK_URL = `${process.env.TWENTY_API_URL}/s/retell/webhook`;

const sign = (rawBody: string, key = TEST_KEY, timestamp = Date.now()) =>
  `v=${timestamp},d=${createHmac('sha256', key).update(rawBody + timestamp).digest('hex')}`;

const post = (payload: object, signature?: string) => {
  const rawBody = JSON.stringify(payload);
  return fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-retell-signature': signature ?? sign(rawBody) },
    body: rawBody,
  });
};

const baseCall = (callId: string, extra: object = {}) => ({
  call_id: callId,
  call_type: 'phone_call',
  direction: 'inbound',
  from_number: '+15550100123',
  to_number: '+15550100999',
  agent_id: 'agent_test',
  call_status: 'ended',
  start_timestamp: 1_790_000_000_000,
  end_timestamp: 1_790_000_060_000,
  duration_ms: 60_000,
  disconnection_reason: 'user_hangup',
  transcript: 'Agent: Hello\nUser: Hi',
  transcript_object: [
    { role: 'agent', content: 'Hello', words: [] },
    { role: 'user', content: 'Hi', words: [] },
  ],
  recording_url: 'https://example.com/recording.wav',
  ...extra,
});

const analysis = { call_summary: 'Test summary', user_sentiment: 'Positive', call_successful: true };

const client = () => new CoreApiClient();

const callsById = async (callId: string) => {
  const result: any = await client().query({
    retellCalls: {
      __args: { filter: { callId: { eq: callId } } },
      edges: { node: { id: true, summary: true, sentiment: true, successful: true, transcript: { markdown: true }, recording: { primaryLinkUrl: true }, person: { id: true }, opportunity: { id: true } } },
    },
  } as any);
  return result.retellCalls.edges.map((edge: any) => edge.node);
};

// Webhooks from an unknown number now create a Person, and Person survives the app reinstall; remove what the tests made.
const TEST_NATIONALS = ['5550100123', '5550100777', '5550100888'];

const purgePeople = async () => {
  for (const national of TEST_NATIONALS) {
    const found: any = await client().query({
      people: { __args: { filter: { phones: { primaryPhoneNumber: { eq: national } } }, first: 50 }, edges: { node: { id: true } } },
    } as any);
    for (const edge of found.people.edges) {
      await client().mutation({ destroyPerson: { __args: { id: edge.node.id }, id: true } } as any);
    }
  }
};

const peopleWithPhone = async (national: string) => {
  const found: any = await client().query({
    people: { __args: { filter: { phones: { primaryPhoneNumber: { eq: national } } }, first: 50 }, edges: { node: { id: true, name: { firstName: true } } } },
  } as any);
  return found.people.edges.map((edge: any) => edge.node);
};

let n = 0;
const newId = () => `itest_${Date.now()}_${n++}`;

beforeAll(async () => {
  const metadata = new MetadataApiClient();
  const apps: any = await metadata.query({ findManyApplications: { id: true, universalIdentifier: true } } as any);
  const app = apps.findManyApplications.find((a: any) => a.universalIdentifier === APPLICATION_UNIVERSAL_IDENTIFIER);
  await metadata.mutation({
    updateOneApplicationVariable: { __args: { key: 'RETELL_API_KEY', value: TEST_KEY, applicationId: app.id } },
  } as any);
});

afterAll(purgePeople);

describe('retell-webhook', () => {
  it('rejects a bad signature', async () => {
    const response = await post({ event: 'call_analyzed', call: baseCall(newId()) }, 'v=1,d=00');
    expect(response.status).toBe(401);
  });

  it('rejects a replayed signature older than five minutes', async () => {
    const rawBody = JSON.stringify({ event: 'call_analyzed', call: baseCall(newId()) });
    const response = await post(JSON.parse(rawBody), sign(rawBody, TEST_KEY, Date.now() - 10 * 60 * 1000));
    expect(response.status).toBe(401);
  });

  it('stores a call and updates it in place on redelivery', async () => {
    const callId = newId();
    const call = baseCall(callId, { call_analysis: analysis });

    expect((await post({ event: 'call_analyzed', call })).status).toBe(200);
    expect((await post({ event: 'call_analyzed', call })).status).toBe(200);

    const rows = await callsById(callId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ summary: 'Test summary', sentiment: 'POSITIVE', successful: true });
    expect(rows[0].transcript.markdown).toBe('**Agent:** Hello\n\n**Customer:** Hi');
    expect(rows[0].recording.primaryLinkUrl).toBe('https://example.com/recording.wav');
  });

  it('does not blank analysis when an older call_ended arrives late', async () => {
    const callId = newId();
    await post({ event: 'call_analyzed', call: baseCall(callId, { call_analysis: analysis }) });
    await post({ event: 'call_ended', call: baseCall(callId) });

    const rows = await callsById(callId);
    expect(rows).toHaveLength(1);
    expect(rows[0].summary).toBe('Test summary');
  });

  it('keeps one record when two events race', async () => {
    const callId = newId();
    await Promise.all([
      post({ event: 'call_ended', call: baseCall(callId) }),
      post({ event: 'call_analyzed', call: baseCall(callId, { call_analysis: analysis }) }),
    ]);

    const rows = await callsById(callId);
    expect(rows).toHaveLength(1);
    expect(rows[0].summary).toBe('Test summary');
  });

  it('links the call to the person with the same phone number', async () => {
    await purgePeople();
    const person: any = await client().mutation({
      createPerson: {
        __args: {
          data: {
            name: { firstName: 'Test', lastName: 'Caller' },
            phones: { primaryPhoneNumber: '5550100123', primaryPhoneCountryCode: 'US', primaryPhoneCallingCode: '+1' },
          },
        },
        id: true,
      },
    } as any);

    try {
      const callId = newId();
      await post({ event: 'call_analyzed', call: baseCall(callId, { call_analysis: analysis }) });

      const rows = await callsById(callId);
      expect(rows[0].person?.id).toBe(person.createPerson.id);
    } finally {
      // Person is a standard object and survives the app reinstall; a leftover would match the next run's call.
      await client().mutation({ destroyPerson: { __args: { id: person.createPerson.id }, id: true } } as any);
    }
  });

  it('creates one person for an unknown number, even when two events arrive together', async () => {
    await purgePeople();
    const call = (id: string) => baseCall(id, { from_number: '+15550100777', call_analysis: analysis });
    const [first, second] = [newId(), newId()];

    await Promise.all([post({ event: 'call_ended', call: call(first) }), post({ event: 'call_analyzed', call: call(second) })]);

    const people = await peopleWithPhone('5550100777');
    expect(people).toHaveLength(1);
    expect(people[0].name.firstName).toBe('+15550100777');
    expect((await callsById(first))[0].person?.id).toBe(people[0].id);
    expect((await callsById(second))[0].person?.id).toBe(people[0].id);
  });

  it('links a call to the opportunity named in its metadata, and takes the opportunity contact when the number matches nobody', async () => {
    await purgePeople();
    const contact: any = await client().mutation({
      createPerson: {
        __args: { data: { name: { firstName: 'Contact', lastName: 'Test' }, phones: { primaryPhoneNumber: '5550100888', primaryPhoneCallingCode: '+1' } } },
        id: true,
      },
    } as any);
    const opportunity: any = await client().mutation({
      createOpportunity: { __args: { data: { name: 'Link test', pointOfContactId: contact.createPerson.id } }, id: true },
    } as any);

    try {
      const callId = newId();
      await post({
        event: 'call_analyzed',
        call: baseCall(callId, { from_number: '+15550100777', metadata: { opportunity_id: opportunity.createOpportunity.id }, call_analysis: analysis }),
      });

      const [row] = await callsById(callId);
      expect(row.opportunity?.id).toBe(opportunity.createOpportunity.id);
      expect(row.person?.id).toBe(contact.createPerson.id);
      expect(await peopleWithPhone('5550100777')).toHaveLength(0);
    } finally {
      await client().mutation({ destroyOpportunity: { __args: { id: opportunity.createOpportunity.id }, id: true } } as any);
    }
  });

  it('links a new call to the newest opportunity of its person and keeps a link set by hand', async () => {
    await purgePeople();
    const person: any = await client().mutation({
      createPerson: {
        __args: { data: { name: { firstName: 'Latest', lastName: 'Test' }, phones: { primaryPhoneNumber: '5550100888', primaryPhoneCallingCode: '+1' } } },
        id: true,
      },
    } as any);
    const make = async (name: string) =>
      (await client().mutation({ createOpportunity: { __args: { data: { name, pointOfContactId: person.createPerson.id } }, id: true } } as any) as any)
        .createOpportunity.id as string;
    const older = await make('Older');
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const newer = await make('Newer');

    try {
      const callId = newId();
      await post({ event: 'call_ended', call: baseCall(callId, { from_number: '+15550100888' }) });
      expect((await callsById(callId))[0].opportunity?.id).toBe(newer);

      // A person moves the call to the older deal; a later event for the same call must not take it back.
      const [row] = await callsById(callId);
      await client().mutation({ updateRetellCall: { __args: { id: row.id, data: { opportunityId: older } }, id: true } } as any);
      await post({ event: 'call_analyzed', call: baseCall(callId, { from_number: '+15550100888', call_analysis: analysis }) });
      expect((await callsById(callId))[0].opportunity?.id).toBe(older);
    } finally {
      for (const id of [older, newer]) await client().mutation({ destroyOpportunity: { __args: { id }, id: true } } as any);
    }
  });

  it('stores a call unlinked when the opportunity id points at nothing', async () => {
    const callId = newId();
    const missing = '00000000-0000-4000-8000-000000000001';
    expect((await post({ event: 'call_ended', call: baseCall(callId, { metadata: { opportunity_id: missing } }) })).status).toBe(200);

    const rows = await callsById(callId);
    expect(rows).toHaveLength(1);
    expect(rows[0].opportunity).toBeNull();
  });

  it('stores a call that has no transcript and no recording', async () => {
    const callId = newId();
    const call = baseCall(callId, { transcript: undefined, transcript_object: undefined, recording_url: undefined });

    expect((await post({ event: 'call_ended', call })).status).toBe(200);
    expect(await callsById(callId)).toHaveLength(1);
  });

  it('ignores events it does not store', async () => {
    const response = await post({ event: 'call_started', call: baseCall(newId()) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ result: 'ignored' });
  });
});
