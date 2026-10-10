// What the analytics page needs from a Retell call, derived from fields the call already carries.
// The status table is the "Debug call disconnection" page (docs.retellai.com/reliability/debug-call-disconnect,
// read 2026-10-10). A reason that is not in it maps to null: a wrong guess would pollute the picked-up rate.

export type Connection = 'CONNECTED' | 'NOT_CONNECTED' | 'ERROR';

const REASONS_BY_CONNECTION: Record<Connection, readonly string[]> = {
  CONNECTED: [
    'user_hangup', 'agent_hangup', 'user_requested_dnc', 'call_transfer', 'transfer_bridged', 'transfer_cancelled',
    'call_take_over', 'voicemail_reached', 'ivr_reached', 'inactivity', 'max_duration_reached', 'no_concurrency_fallback',
  ],
  NOT_CONNECTED: [
    'dial_busy', 'dial_failed', 'dial_no_answer', 'invalid_destination', 'telephony_provider_permission_denied',
    'telephony_provider_unavailable', 'sip_routing_error', 'marked_as_spam', 'network_blocked', 'user_declined',
  ],
  ERROR: [
    'concurrency_limit_reached', 'no_valid_payment', 'credit_exhausted', 'budget_reached', 'scam_detected',
    'error_llm_websocket_open', 'error_llm_websocket_lost_connection', 'error_llm_websocket_runtime',
    'error_llm_websocket_corrupt_payload', 'error_no_audio_received', 'error_asr', 'error_retell', 'error_unknown',
    'error_user_not_joined', 'registered_call_timeout',
  ],
};

const CONNECTION_BY_REASON = new Map<string, Connection>(
  (Object.entries(REASONS_BY_CONNECTION) as [Connection, readonly string[]][]).flatMap(([connection, reasons]) =>
    reasons.map((reason) => [reason, connection] as const),
  ),
);

export const connectionOf = (reason: unknown): Connection | null =>
  typeof reason === 'string' ? (CONNECTION_BY_REASON.get(reason) ?? null) : null;

const TRANSFER_REASONS = new Set(['call_transfer', 'transfer_bridged']);

// null while the call has no reason yet, so an in-progress call is not counted as "not transferred".
export const transferredOf = (reason: unknown): boolean | null =>
  typeof reason === 'string' && reason ? TRANSFER_REASONS.has(reason) : null;

// Retell fills `latency` only after the call ends.
export const latencyP50Of = (call: Record<string, any>): number | null => {
  const p50 = call.latency?.e2e?.p50;
  return typeof p50 === 'number' && Number.isFinite(p50) ? Math.round(p50) : null;
};
