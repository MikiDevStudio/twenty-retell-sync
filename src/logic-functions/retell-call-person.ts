import { defineLogicFunction } from 'twenty-sdk/define';
import { jsonSchemaToInputSchema } from 'twenty-sdk/logic-function';

import { CALL_PERSON_FN_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { planPhoneCall, type CallInput } from 'src/lib/outbound';
import { createPhoneCall } from 'src/lib/retell-api';
import { getSettings } from 'src/lib/settings-store';
import { getPersonForCall } from 'src/lib/store';

const FIELDS = {
  personId: 'The Person to call. The call goes to their primary phone number.',
  opportunityId: 'Optional Opportunity the call is about; the finished call is linked to it.',
  fromNumber: 'Optional Retell number to call from, E.164 (+15551234567). Default: the number set on the Retell tab.',
  agentId: 'Optional Retell voice agent id. Default: the agent set on the Retell tab, else the agent bound to the number.',
  idempotencyKey: 'Optional key (5-255 letters, digits, _ or -). Retrying with the same key within an hour places no second call.',
};

// An AI tool and a workflow step that places a real outbound call through Retell. It refuses a do-not-call person
// before Retell is asked, and Retell refuses again for a number its own contacts mark do-not-call.
const handler = async (params: CallInput & { personId?: string | null }) => {
  const personId = params.personId?.trim();
  if (!personId) throw new Error('personId is required');

  const person = await getPersonForCall(personId);
  if (!person) throw new Error(`Person ${personId} not found`);

  const settings = await getSettings();
  const plan = planPhoneCall(person, params, { fromNumber: settings.outboundFromNumber, agentId: settings.outboundAgentId });
  if (!plan.ok) throw new Error(plan.reason);

  const call = await createPhoneCall(plan.request);

  return {
    callId: call.call_id ?? null,
    status: call.call_status ?? null,
    personId,
    fromNumber: plan.request.from_number,
    toNumber: plan.request.to_number,
    agentId: call.agent_id ?? null,
  };
};

export default defineLogicFunction({
  universalIdentifier: CALL_PERSON_FN_UNIVERSAL_IDENTIFIER,
  name: 'retell-call-person',
  description:
    'Places a real outbound phone call to a Person with a Retell voice agent. The call costs money and reaches a real ' +
    'person, so always propose this tool call for approval first and never call it directly. Refuses do-not-call people. ' +
    'Returns the Retell call id; the call record appears in Retell Calls when it ends (refresh it with retell-get-call).',
  timeoutSeconds: 30,
  handler,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: FIELDS.personId },
        opportunityId: { type: 'string', description: FIELDS.opportunityId },
        fromNumber: { type: 'string', description: FIELDS.fromNumber },
        agentId: { type: 'string', description: FIELDS.agentId },
        variables: {
          type: 'object',
          description:
            'Optional extra dynamic variables for the agent prompt, string values. first_name, last_name, full_name, ' +
            'email, company_name, twenty_person_id and opportunity_id are filled in already.',
        },
        idempotencyKey: { type: 'string', description: FIELDS.idempotencyKey },
      },
      required: ['personId'],
    },
  },
  workflowActionTriggerSettings: {
    label: 'Retell: call person',
    icon: 'IconPhoneOutgoing',
    inputSchema: jsonSchemaToInputSchema({
      type: 'object',
      properties: {
        personId: { type: 'string', label: 'Person ID', description: FIELDS.personId },
        opportunityId: { type: 'string', label: 'Opportunity ID', description: FIELDS.opportunityId },
        fromNumber: { type: 'string', label: 'From number', description: FIELDS.fromNumber },
        agentId: { type: 'string', label: 'Agent ID', description: FIELDS.agentId },
        idempotencyKey: { type: 'string', label: 'Idempotency key', description: FIELDS.idempotencyKey },
      },
      required: ['personId'],
    }),
    outputSchema: jsonSchemaToInputSchema({
      type: 'object',
      properties: Object.fromEntries(
        ['callId', 'status', 'personId', 'fromNumber', 'toNumber', 'agentId'].map((key) => [key, { type: 'string' }]),
      ),
    }),
  },
});
