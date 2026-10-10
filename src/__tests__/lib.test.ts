import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { chatPhone, mapCall, mapChat, opportunityIdOf, parseExcluded, personName } from 'src/lib/mapping';
import { createsPeople, linksLatestOpportunity } from 'src/lib/save';
import { nationalCandidates, phoneMatches, splitE164 } from 'src/lib/phone';
import { isPublicUrl, isSyncDue, normalizeSettings, webhookUrlFor } from 'src/lib/settings';
import { buildTranscript } from 'src/lib/transcript';
import { parseTurns } from 'src/lib/transcript-view';
import { explainRejection, rawBodyOf, verifyRetellSignature } from 'src/lib/signature';
import { syncKind, type SyncDeps } from 'src/lib/sync';

const NOW = 1_790_000_000_000;

describe('verifyRetellSignature', () => {
  const body = '{"event":"call_analyzed"}';
  const signed = (key: string, ts: number) =>
    `v=${ts},d=${createHmac('sha256', key).update(body + ts).digest('hex')}`;

  it('accepts a valid signature', () => {
    expect(verifyRetellSignature(body, 'k', signed('k', NOW), NOW)).toBe(true);
  });

  it('rejects a wrong key, a changed body, a stale timestamp and garbage', () => {
    expect(verifyRetellSignature(body, 'other', signed('k', NOW), NOW)).toBe(false);
    expect(verifyRetellSignature(body + ' ', 'k', signed('k', NOW), NOW)).toBe(false);
    expect(verifyRetellSignature(body, 'k', signed('k', NOW), NOW + 6 * 60 * 1000)).toBe(false);
    expect(verifyRetellSignature(body, 'k', 'nonsense', NOW)).toBe(false);
    expect(verifyRetellSignature(body, 'k', undefined, NOW)).toBe(false);
  });
});

describe('explainRejection', () => {
  const body = { text: '{}', source: 'rawBody' as const };

  it('picks the signed body from rawBody, a string or a base64 body, never a parsed one', () => {
    expect(rawBodyOf({ rawBody: '{"a":1}', body: { a: 1 } })).toEqual({ text: '{"a":1}', source: 'rawBody' });
    expect(rawBodyOf({ body: '{"a":1}' })).toEqual({ text: '{"a":1}', source: 'body-string' });
    expect(rawBodyOf({ body: Buffer.from('{"a":1}').toString('base64'), isBase64Encoded: true }).text).toBe('{"a":1}');
    expect(rawBodyOf({ body: { a: 1 } })).toEqual({ text: '', source: 'missing' });
  });

  it('names the likely cause without exposing secrets', () => {
    expect(explainRejection(undefined, 'k', body, NOW)).toBe('no signature header');
    expect(explainRejection('garbage', 'k', body, NOW)).toContain('unexpected format');
    expect(explainRejection(`v=${NOW - 20 * 60 * 1000},d=00`, 'k', body, NOW)).toContain('clock differs');
    expect(explainRejection(`v=${NOW},d=00`, 'k', body, NOW)).toContain('digest does not match');
    expect(explainRejection(`v=${NOW},d=00`, '', body, NOW)).toContain('no Retell API key');
    expect(explainRejection(`v=${NOW},d=00`, 'k', { text: '', source: 'missing' }, NOW)).toContain('rawBody is missing');
  });
});

describe('phone matching', () => {
  it('offers national suffixes of an E.164 number', () => {
    expect(nationalCandidates('+12137771234')).toContain('2137771234');
  });

  it('confirms the calling code so a shared suffix in another country does not match', () => {
    const us = { primaryPhoneNumber: '2137771234', primaryPhoneCallingCode: '+1' };
    expect(phoneMatches('+12137771234', us)).toBe(true);
    expect(phoneMatches('+442137771234', us)).toBe(false);
    expect(phoneMatches('+12137771234', { primaryPhoneNumber: '', primaryPhoneCallingCode: '+1' })).toBe(false);
  });
});

describe('mapping', () => {
  const call = {
    call_id: 'c1',
    direction: 'inbound',
    from_number: '+15550100123',
    start_timestamp: NOW,
    call_analysis: { call_summary: 's', user_sentiment: 'Positive', call_successful: false },
    call_cost: { combined_cost: 12 },
    transcript: 'secret words',
  };

  it('maps a call and keeps successful=false distinct from missing', () => {
    const data = mapCall(call, new Set());
    expect(data).toMatchObject({ callId: 'c1', direction: 'INBOUND', sentiment: 'POSITIVE', successful: false, costCents: 12 });
    expect(mapCall({ call_id: 'c2' }, new Set()).successful).toBeNull();
  });

  it('drops excluded fields but never the id or the name', () => {
    const data = mapCall(call, parseExcluded('transcript, callId, summary'));
    expect(data).not.toHaveProperty('transcript');
    expect(data).not.toHaveProperty('summary');
    expect(data).toHaveProperty('callId', 'c1');
    expect(data).toHaveProperty('name');
  });

  it('derives connection, transferred and latency from the call', () => {
    const data = mapCall(
      { call_id: 'd1', disconnection_reason: 'call_transfer', latency: { e2e: { p50: 640.2 } } },
      new Set(),
    );
    expect(data).toMatchObject({ connection: 'CONNECTED', transferred: true, latencyP50Ms: 640 });
    expect(mapCall({ call_id: 'd2', disconnection_reason: 'dial_no_answer' }, new Set())).toMatchObject({
      connection: 'NOT_CONNECTED',
      transferred: false,
      latencyP50Ms: null,
    });
  });

  it('leaves the derived fields null for a call in progress, so an update never blanks stored values', () => {
    expect(mapCall({ call_id: 'd3' }, new Set())).toMatchObject({
      connection: null,
      transferred: null,
      latencyP50Ms: null,
    });
  });

  it('drops a derived field named in the exclude list', () => {
    const data = mapCall({ call_id: 'd4', disconnection_reason: 'user_hangup' }, parseExcluded('connection'));
    expect(data).not.toHaveProperty('connection');
    expect(data).toHaveProperty('transferred', false);
  });

  it('maps the agent name and a duration for chats, as calls have', () => {
    const chat = mapChat({ chat_id: 'x', agent_name: 'Agent', start_timestamp: 1000, end_timestamp: 4500 }, new Set());
    expect(chat).toMatchObject({ agentName: 'Agent', durationMs: 3500 });
    expect(mapChat({ chat_id: 'y', start_timestamp: 1000 }, new Set())).toMatchObject({ agentName: null, durationMs: null });
  });

  it('finds a chat phone number only where an agent can put one', () => {
    expect(chatPhone({ metadata: { user_number: '+15550100123' } })).toBe('+15550100123');
    expect(chatPhone({ metadata: { user_number: 'no-plus' } })).toBeNull();
    expect(mapChat({ chat_id: 'x', metadata: { phone: '+15550100123' } }, new Set())).toMatchObject({ userNumber: '+15550100123' });
  });
});

describe('syncKind', () => {
  const item = (id: string, start: number, status = 'ended', analyzed = true) => ({
    id,
    start_timestamp: start,
    end_timestamp: start + 1000,
    status,
    analyzed,
  });

  const run = async (items: ReturnType<typeof item>[], overrides: Partial<SyncDeps> = {}) => {
    const saved: string[] = [];
    let mark: number | null = null;
    const deps: SyncDeps = {
      now: NOW,
      backfillDays: 30,
      maxPerRun: 100,
      list: async () => ({ items, has_more: false }),
      fetchFull: async (id) => ({ id }),
      idOf: (i) => i.id,
      isFinal: (i) => i.status === 'ended',
      hasAnalysis: (i) => i.analyzed,
      find: async () => null,
      save: async (full) => {
        saved.push(full.id);
        return 'created';
      },
      watermark: { get: async () => mark, set: async (v) => void (mark = v) },
      ...overrides,
    };
    const report = await syncKind(deps);
    return { report, saved, mark: () => mark };
  };

  it('saves everything and moves the watermark to the last settled item', async () => {
    const { report, saved, mark } = await run([item('a', NOW - 5000), item('b', NOW - 4000)]);
    expect(saved).toEqual(['a', 'b']);
    expect(report.created).toBe(2);
    expect(mark()).toBe(NOW - 4000);
  });

  it('keeps the watermark before an ongoing call so it is looked at again', async () => {
    const { mark } = await run([item('a', NOW - 5000), item('b', NOW - 4000, 'ongoing'), item('c', NOW - 3000)]);
    expect(mark()).toBe(NOW - 5000);
  });

  it('keeps the watermark before a failure and reports it', async () => {
    const { report, mark } = await run([item('a', NOW - 5000), item('b', NOW - 4000), item('c', NOW - 3000)], {
      save: async (full) => {
        if (full.id === 'b') throw new Error('boom');
        return 'created';
      },
    });
    expect(report.failed).toBe(1);
    expect(report.error).toBe('boom');
    expect(mark()).toBe(NOW - 5000);
  });

  it('skips what Twenty already has up to date', async () => {
    const { report, saved } = await run([item('a', NOW - 5000)], {
      find: async () => ({ id: '1', summary: 'done', endedAt: null, opportunityId: null }),
    });
    expect(saved).toEqual([]);
    expect(report.skipped).toBe(1);
  });

  it('rewrites records that already look complete when forced (resync)', async () => {
    const { report, saved } = await run([item('a', NOW - 5000)], {
      force: true,
      find: async () => ({ id: '1', summary: 'done', endedAt: null, opportunityId: null }),
    });
    expect(saved).toEqual(['a']);
    expect(report.skipped).toBe(0);
  });

  it('walks a long period in chunks: each run resumes from the cursor and the last one reports no more', async () => {
    const items = [1, 2, 3, 4, 5].map((n) => item(`i${n}`, NOW - (6 - n) * 1000));
    let cursor: number | null = NOW - 100_000;
    const saved: string[] = [];
    const watermark = { get: async () => cursor, set: async (v: number) => void (cursor = v) };

    let more = true;
    let runs = 0;
    while (more && runs < 10) {
      const report = (
        await run(items.filter((i) => i.start_timestamp > (cursor ?? 0)), { force: true, maxPerRun: 2, watermark, save: async (f) => (saved.push(f.id), 'updated') })
      ).report;
      more = report.hasMore;
      runs++;
    }

    expect(saved).toEqual(['i1', 'i2', 'i3', 'i4', 'i5']);
    expect(runs).toBe(3);
  });

  it('stops at maxPerRun and says there is more', async () => {
    const { report, saved } = await run([item('a', NOW - 5000), item('b', NOW - 4000)], { maxPerRun: 1 });
    expect(saved).toEqual(['a']);
    expect(report.hasMore).toBe(true);
  });
});

describe('settings', () => {
  it('clamps the interval to the 5 minute tick and falls back to the default', () => {
    expect(normalizeSettings({ intervalMinutes: 1 }).intervalMinutes).toBe(5);
    expect(normalizeSettings({ intervalMinutes: 30 }).intervalMinutes).toBe(30);
    expect(normalizeSettings({ intervalMinutes: 'abc' as any }).intervalMinutes).toBe(10);
    expect(normalizeSettings(null).intervalMinutes).toBe(10);
  });

  it('keeps only a valid public URL, without a trailing slash', () => {
    expect(normalizeSettings({ publicUrl: ' https://crm.example.com/ ' }).publicUrl).toBe('https://crm.example.com');
    expect(normalizeSettings({ publicUrl: 'crm.example.com' }).publicUrl).toBe('');
  });

  it('builds the webhook URL under /s', () => {
    expect(webhookUrlFor('https://crm.example.com/')).toBe('https://crm.example.com/s/retell/webhook');
  });

  it('rejects addresses Retell cannot reach', () => {
    expect(isPublicUrl('https://crm.example.com')).toBe(true);
    for (const url of ['http://localhost:2020', 'http://127.0.0.1:3000', 'http://192.168.1.5', 'http://server:3000', 'https://x.internal', '']) {
      expect(isPublicUrl(url)).toBe(false);
    }
  });

  it('is due after the interval, with slack for cron jitter, and on first run', () => {
    const min = 60_000;
    expect(isSyncDue(null, NOW, 10)).toBe(true);
    expect(isSyncDue(NOW - 5 * min, NOW, 10)).toBe(false);
    expect(isSyncDue(NOW - 9.5 * min, NOW, 10)).toBe(true);
  });
});

describe('transcript', () => {
  const call = {
    recording_url: 'https://example.com/r.wav',
    transcript_object: [
      { role: 'agent', content: 'Hello', words: [] },
      { role: 'user', content: 'Hi there', words: [] },
    ],
  };

  it('labels each turn and puts the recording player first', () => {
    const rich = buildTranscript(call, call.recording_url)!;
    expect(rich.markdown).toBe('**Agent:** Hello\n\n**Customer:** Hi there');
    const blocks = JSON.parse(rich.blocknote);
    expect(blocks.map((b: any) => b.type)).toEqual(['audio', 'paragraph', 'paragraph']);
    expect(blocks[0].props.url).toBe(call.recording_url);
    expect(blocks[1].content[0]).toMatchObject({ text: 'Agent: ', styles: { bold: true } });
  });

  it('reads chat messages and skips tool calls', () => {
    const rich = buildTranscript({
      message_with_tool_calls: [
        { role: 'agent', content: 'Hi' },
        { role: 'tool_call_invocation', content: '', name: 'lookup' },
        { role: 'user', content: 'Help' },
      ],
    })!;
    expect(rich.markdown).toBe('**Agent:** Hi\n\n**Customer:** Help');
  });

  it('falls back to the flat transcript string and returns null when there is none', () => {
    expect(buildTranscript({ transcript: 'Agent: Hi\nUser: Yo' })!.markdown).toBe('**Agent:** Hi\n\n**Customer:** Yo');
    expect(buildTranscript({})).toBeNull();
  });

  it('uses the PII-scrubbed copies when an agent stores everything except PII', () => {
    const scrubbed = {
      call_id: 'c9',
      scrubbed_transcript_with_tool_calls: [
        { role: 'agent', content: 'Hello [person name 1]' },
        { role: 'tool_call_invocation', content: '', name: 'lookup' },
        { role: 'user', content: 'Hi' },
      ],
      scrubbed_recording_url: 'https://example.com/scrubbed.wav',
      scrubbed_call_analysis: { call_summary: 'Caller [person name 1] asked', custom_analysis_data: { city: 'X' } },
      scrubbed_retell_llm_dynamic_variables: { name: '[person name 1]' },
    };
    const data = mapCall(scrubbed, new Set());
    expect(data).toMatchObject({
      summary: 'Caller [person name 1] asked',
      analysis: { city: 'X' },
      dynamicVariables: { name: '[person name 1]' },
      recording: { primaryLinkUrl: 'https://example.com/scrubbed.wav' },
    });
    expect((data.transcript as any).markdown).toBe('**Agent:** Hello [person name 1]\n\n**Customer:** Hi');
  });

  it('maps the recording as a link only and honours the exclude list', () => {
    expect(mapCall(call as any, new Set()).recording).toMatchObject({ primaryLinkUrl: call.recording_url });
    const excluded = mapCall(call as any, parseExcluded('recording'));
    expect(excluded).not.toHaveProperty('recording');
    expect(JSON.parse((excluded.transcript as any).blocknote).map((b: any) => b.type)).not.toContain('audio');
  });

  it('reads the stored markdown back into labelled turns for the Transcript tab', () => {
    const rich = buildTranscript(call)!;
    expect(parseTurns(rich.markdown)).toEqual([
      { label: 'Agent', text: 'Hello' },
      { label: 'Customer', text: 'Hi there' },
    ]);
    expect(parseTurns('no label here')).toEqual([{ label: null, text: 'no label here' }]);
  });
});

describe('creating people from unknown numbers', () => {
  it('splits E.164 numbers into calling code and national number', () => {
    expect(splitE164('+15550100123')).toEqual({ callingCode: '+1', national: '5550100123' });
    expect(splitE164('+442071234567')).toEqual({ callingCode: '+44', national: '2071234567' });
    expect(splitE164('+380441234567')).toEqual({ callingCode: '+380', national: '441234567' });
    expect(splitE164('+79991234567')).toEqual({ callingCode: '+7', national: '9991234567' });
    expect(splitE164('5550100123')).toBeNull();
    expect(splitE164('+1555')).toBeNull();
  });

  it('is on unless the variable says false', () => {
    expect(createsPeople(undefined)).toBe(true);
    expect(createsPeople('')).toBe(true);
    expect(createsPeople('true')).toBe(true);
    expect(createsPeople('False ')).toBe(false);
  });

  it('names the person from dynamic variables, never from scrubbed placeholders, else by the number', () => {
    expect(personName({ retell_llm_dynamic_variables: { first_name: 'Ann', last_name: 'Lee' } }, '+15550100123')).toEqual({ firstName: 'Ann', lastName: 'Lee' });
    expect(personName({ retell_llm_dynamic_variables: { name: '[person name 1]' } }, '+15550100123')).toEqual({ firstName: '+15550100123', lastName: '' });
    expect(personName({}, '+15550100123')).toEqual({ firstName: '+15550100123', lastName: '' });
  });
});

describe('linking to an opportunity', () => {
  const id = '3f2b8c1e-9d4a-4e6b-8a57-1c0d9e2f4a6b';

  it('reads the id from metadata, dynamic variables or custom attributes', () => {
    expect(opportunityIdOf({ metadata: { opportunity_id: id } })).toBe(id);
    expect(opportunityIdOf({ retell_llm_dynamic_variables: { twenty_opportunity_id: id.toUpperCase() } })).toBe(id);
    expect(opportunityIdOf({ custom_attributes: { opportunity_id: id } })).toBe(id);
  });

  it('links to the newest opportunity unless the variable says false', () => {
    expect(linksLatestOpportunity(undefined)).toBe(true);
    expect(linksLatestOpportunity('')).toBe(true);
    expect(linksLatestOpportunity('false')).toBe(false);
  });

  it('ignores anything that is not an id', () => {
    expect(opportunityIdOf({})).toBeNull();
    expect(opportunityIdOf({ metadata: { opportunity_id: 'not-an-id' } })).toBeNull();
    expect(opportunityIdOf({ metadata: { opportunity_id: 42 } })).toBeNull();
  });
});
