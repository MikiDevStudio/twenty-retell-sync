import { describe, expect, it } from 'vitest';

import { connectionOf, latencyP50Of, transferredOf } from 'src/lib/call-outcome';

// Status column of "Debug call disconnection" (docs.retellai.com/reliability/debug-call-disconnect, read 2026-10-10).
const ENDED = [
  'user_hangup', 'agent_hangup', 'user_requested_dnc', 'call_transfer', 'transfer_bridged', 'transfer_cancelled',
  'call_take_over', 'voicemail_reached', 'ivr_reached', 'inactivity', 'max_duration_reached', 'no_concurrency_fallback',
];
const NOT_CONNECTED = [
  'dial_busy', 'dial_failed', 'dial_no_answer', 'invalid_destination', 'telephony_provider_permission_denied',
  'telephony_provider_unavailable', 'sip_routing_error', 'marked_as_spam', 'network_blocked', 'user_declined',
];
const ERROR = [
  'concurrency_limit_reached', 'no_valid_payment', 'credit_exhausted', 'budget_reached', 'scam_detected',
  'error_llm_websocket_open', 'error_llm_websocket_lost_connection', 'error_llm_websocket_runtime',
  'error_llm_websocket_corrupt_payload', 'error_no_audio_received', 'error_asr', 'error_retell', 'error_unknown',
  'error_user_not_joined', 'registered_call_timeout',
];

describe('connectionOf', () => {
  it.each(ENDED)('%s is CONNECTED', (reason) => expect(connectionOf(reason)).toBe('CONNECTED'));
  it.each(NOT_CONNECTED)('%s is NOT_CONNECTED', (reason) => expect(connectionOf(reason)).toBe('NOT_CONNECTED'));
  it.each(ERROR)('%s is ERROR', (reason) => expect(connectionOf(reason)).toBe('ERROR'));

  it('leaves reasons without a documented status unmapped instead of guessing', () => {
    // Both are in the get-call enum but not in the status table.
    expect(connectionOf('user_requested_callback')).toBeNull();
    expect(connectionOf('manual_stopped')).toBeNull();
    expect(connectionOf('some_future_reason')).toBeNull();
  });

  it('returns null for a call that has no reason yet', () => {
    expect(connectionOf(undefined)).toBeNull();
    expect(connectionOf(null)).toBeNull();
    expect(connectionOf('')).toBeNull();
    expect(connectionOf(42)).toBeNull();
  });
});

describe('transferredOf', () => {
  it('is true for the two transfer reasons only', () => {
    expect(transferredOf('call_transfer')).toBe(true);
    expect(transferredOf('transfer_bridged')).toBe(true);
    expect(transferredOf('transfer_cancelled')).toBe(false);
    expect(transferredOf('user_hangup')).toBe(false);
  });

  it('is null when the call has no reason yet', () => {
    expect(transferredOf(undefined)).toBeNull();
    expect(transferredOf('')).toBeNull();
  });
});

describe('latencyP50Of', () => {
  it('reads the end-to-end p50 and rounds to whole milliseconds', () => {
    expect(latencyP50Of({ latency: { e2e: { p50: 812.4 } } })).toBe(812);
  });

  it('is null when latency is missing, partial or not a number', () => {
    expect(latencyP50Of({})).toBeNull();
    expect(latencyP50Of({ latency: {} })).toBeNull();
    expect(latencyP50Of({ latency: { e2e: {} } })).toBeNull();
    expect(latencyP50Of({ latency: { e2e: { p50: Number.NaN } } })).toBeNull();
    expect(latencyP50Of({ latency: { e2e: { p50: '812' } } })).toBeNull();
  });
});
