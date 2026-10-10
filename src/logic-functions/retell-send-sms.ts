import { defineLogicFunction } from 'twenty-sdk/define';
import { jsonSchemaToInputSchema } from 'twenty-sdk/logic-function';

import { SEND_SMS_FN_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { planSmsChat, type CallInput } from 'src/lib/outbound';
import { createSmsChat } from 'src/lib/retell-api';
import { getSettings } from 'src/lib/settings-store';
import { getPersonForCall } from 'src/lib/store';

const FIELDS = {
  personId: 'The Person to text. The SMS goes to their primary phone number.',
  opportunityId: 'Optional Opportunity the conversation is about; the finished chat is linked to it.',
  fromNumber: 'Optional SMS-enabled Retell number to send from, E.164 (+15551234567). Default: the SMS number set on the Retell tab.',
  agentId: 'Optional Retell chat agent id. Default: the SMS agent set on the Retell tab, else the SMS agent bound to the number.',
};

// An AI tool and a workflow step that starts a real SMS conversation through Retell. Retell takes no message text:
// the chat agent writes the first message from its prompt and the dynamic variables, then answers the replies.
const handler = async (params: CallInput & { personId?: string | null }) => {
  const personId = params.personId?.trim();
  if (!personId) throw new Error('personId is required');

  const person = await getPersonForCall(personId);
  if (!person) throw new Error(`Person ${personId} not found`);

  const settings = await getSettings();
  const plan = planSmsChat(person, params, { fromNumber: settings.smsFromNumber, agentId: settings.smsAgentId });
  if (!plan.ok) throw new Error(plan.reason);

  const chat = await createSmsChat(plan.request);

  return {
    chatId: chat.chat_id ?? null,
    status: chat.chat_status ?? null,
    personId,
    fromNumber: plan.request.from_number,
    toNumber: plan.request.to_number,
    agentId: chat.agent_id ?? null,
  };
};

export default defineLogicFunction({
  universalIdentifier: SEND_SMS_FN_UNIVERSAL_IDENTIFIER,
  name: 'retell-send-sms',
  description:
    'Starts a real SMS conversation with a Person through a Retell chat agent. The agent writes the first message ' +
    'itself from its prompt; pass what it should know in variables. The text reaches a real person and costs money, ' +
    'so always propose this tool call for approval first and never call it directly. Refuses do-not-call people. ' +
    'Returns the Retell chat id; the conversation appears in Retell Chats when it ends.',
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
            'Optional extra dynamic variables for the agent prompt, string values (for example the reason to write). ' +
            'first_name, last_name, full_name, email, company_name, twenty_person_id and opportunity_id are filled in already.',
        },
      },
      required: ['personId'],
    },
  },
  workflowActionTriggerSettings: {
    label: 'Retell: send SMS',
    icon: 'IconMessage',
    inputSchema: jsonSchemaToInputSchema({
      type: 'object',
      properties: {
        personId: { type: 'string', label: 'Person ID', description: FIELDS.personId },
        opportunityId: { type: 'string', label: 'Opportunity ID', description: FIELDS.opportunityId },
        fromNumber: { type: 'string', label: 'From number', description: FIELDS.fromNumber },
        agentId: { type: 'string', label: 'Agent ID', description: FIELDS.agentId },
      },
      required: ['personId'],
    }),
    outputSchema: jsonSchemaToInputSchema({
      type: 'object',
      properties: Object.fromEntries(
        ['chatId', 'status', 'personId', 'fromNumber', 'toNumber', 'agentId'].map((key) => [key, { type: 'string' }]),
      ),
    }),
  },
});
