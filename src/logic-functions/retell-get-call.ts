import { defineLogicFunction } from 'twenty-sdk/define';
import { jsonSchemaToInputSchema } from 'twenty-sdk/logic-function';

import { GET_CALL_FN_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { getCall } from 'src/lib/retell-api';
import { saveCall } from 'src/lib/save';

const CALL_ID = 'Retell call id (the Call ID field of a Retell Call record), e.g. call_abc123';

// An AI tool and a workflow step: re-reads one call from Retell, saves it into its Retell Call record
// (which also refreshes a recording link that has expired) and returns the main fields.
const handler = async (params: { callId?: string | null }) => {
  const callId = params.callId?.trim();
  if (!callId) throw new Error('callId is required');

  const call = await getCall(callId);
  const result = await saveCall(call);
  const analysis = (call.call_analysis ?? {}) as Record<string, unknown>;

  return {
    callId,
    record: result,
    status: call.call_status ?? null,
    direction: call.direction ?? null,
    fromNumber: call.from_number ?? null,
    toNumber: call.to_number ?? null,
    durationMs: call.duration_ms ?? null,
    disconnectionReason: call.disconnection_reason ?? null,
    summary: analysis.call_summary ?? null,
    sentiment: analysis.user_sentiment ?? null,
    successful: analysis.call_successful ?? null,
    recordingUrl: call.recording_url ?? null,
  };
};

export default defineLogicFunction({
  universalIdentifier: GET_CALL_FN_UNIVERSAL_IDENTIFIER,
  name: 'retell-get-call',
  description:
    'Fetches one Retell call by its Retell call id, saves the latest data (summary, status, a fresh recording link) ' +
    'into its Retell Call record and returns the main fields. Read-only on the Retell side.',
  timeoutSeconds: 30,
  handler,
  toolTriggerSettings: {
    inputSchema: { type: 'object', properties: { callId: { type: 'string', description: CALL_ID } }, required: ['callId'] },
  },
  workflowActionTriggerSettings: {
    label: 'Retell: refresh call',
    icon: 'IconPhoneCall',
    inputSchema: jsonSchemaToInputSchema({
      type: 'object',
      properties: { callId: { type: 'string', label: 'Retell call ID', description: CALL_ID } },
      required: ['callId'],
    }),
    outputSchema: jsonSchemaToInputSchema({
      type: 'object',
      properties: Object.fromEntries(
        ['callId', 'record', 'status', 'direction', 'fromNumber', 'toNumber', 'disconnectionReason', 'summary', 'sentiment', 'recordingUrl']
          .map((key) => [key, { type: 'string' }])
          .concat([['durationMs', { type: 'number' }], ['successful', { type: 'boolean' }]]),
      ),
    }),
  },
});
