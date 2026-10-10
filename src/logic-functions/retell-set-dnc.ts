import { defineLogicFunction } from 'twenty-sdk/define';
import { jsonSchemaToInputSchema } from 'twenty-sdk/logic-function';

import { SET_DNC_FN_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { applyTwentyChange } from 'src/lib/dnc-sync';
import { getPerson } from 'src/lib/store';

// A workflow step: "when my own doNotCall field changes, set the Retell flag". The workspace builds the
// workflow around it, so the app needs no knowledge of the workspace's own fields.
const handler = async (params: { personId?: string | null; doNotCall?: boolean | null }) => {
  if (!params.personId) throw new Error('personId is required');
  const person = await getPerson(params.personId);
  if (!person) throw new Error(`Person ${params.personId} not found`);

  const value = Boolean(params.doNotCall);
  return { personId: person.id, doNotCall: value, retell: await applyTwentyChange(person, value) };
};

export default defineLogicFunction({
  universalIdentifier: SET_DNC_FN_UNIVERSAL_IDENTIFIER,
  name: 'retell-set-dnc',
  description: 'Sets or clears do-not-call on a Person and on the Retell contact for their number',
  timeoutSeconds: 30,
  handler,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      properties: {
        personId: { type: 'string', description: 'The Person to change' },
        doNotCall: { type: 'boolean', description: 'true sets the flag, false clears it' },
      },
      required: ['personId', 'doNotCall'],
    },
  },
  workflowActionTriggerSettings: {
    label: 'Retell: set do-not-call',
    icon: 'IconPhoneOff',
    inputSchema: jsonSchemaToInputSchema({
      type: 'object',
      properties: {
        personId: { type: 'string', label: 'Person ID', description: 'The Person to change' },
        doNotCall: { type: 'boolean', label: 'Do not call', description: 'true sets the flag, false clears it' },
      },
      required: ['personId', 'doNotCall'],
    }),
  },
});
