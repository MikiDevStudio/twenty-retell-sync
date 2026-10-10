import { defineSkill } from 'twenty-sdk/define';

import { RETELL_SKILL_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

// Teaches Twenty's AI the app's data and tools. Plain text: a change here needs no code change elsewhere,
// but tool names and field names below must follow the logic functions and objects of this app.
const CONTENT = `You work with Retell AI voice and SMS agents through the Retell Sync app.

## Data

- **Retell Calls** (\`retellCall\`): one record per phone call. Key fields: \`callId\` (Retell id, e.g. call_abc123), \`direction\` (INBOUND or OUTBOUND), \`callStatus\`, \`fromNumber\`, \`toNumber\`, \`startedAt\`, \`endedAt\`, \`durationMs\`, \`disconnectionReason\`, \`summary\`, \`sentiment\`, \`successful\`, \`transcript\`, \`recording\` (link to the audio), \`analysis\` (custom post-call data), \`agentName\`, \`person\`, \`opportunity\`.
- **Retell Chats** (\`retellChat\`): one record per SMS or web chat, same idea with \`chatId\` and \`userNumber\`.
- On **Person**: \`retellDoNotCall\` (true = never call or text), \`retellDoNotCallSource\` (RETELL_CALL, RETELL_CONTACT or TWENTY), \`retellLastContactedAt\`, and the relations to their calls and chats.
- Calls and chats are linked to a Person by phone number and to an Opportunity when the call carried its id.

## Tools

- \`app_retell_get_call\`: re-reads one call from Retell by \`callId\`, saves it and returns summary, status and a fresh recording link. Read-only on the Retell side, safe to call. Use it when a record looks incomplete or its recording link has expired.
- \`app_retell_call_person\`: places a real outbound phone call to a Person (\`personId\`, optional \`opportunityId\`, \`fromNumber\`, \`agentId\`, \`variables\`, \`idempotencyKey\`).
- \`app_retell_send_sms\`: starts a real SMS conversation with a Person (same inputs, no \`idempotencyKey\`). The Retell chat agent writes the first message itself; put the reason to write in \`variables\`, never a ready text.
- \`app_retell_set_dnc\`: sets or clears do-not-call on a Person and on Retell (\`personId\`, \`doNotCall\`).

## Rules

1. A call or an SMS reaches a real person and costs money. Never run \`app_retell_call_person\` or \`app_retell_send_sms\` directly: always propose the call for approval with the exact arguments, one person at a time.
2. Before proposing one, read the Person and check \`retellDoNotCall\`. If it is true, do not propose; say the person is do-not-call. Do not clear the flag to get around it unless the user explicitly asks to clear it.
3. Pass \`opportunityId\` when the user talks about a deal, so the finished call links to it.
4. The new call record appears in Retell Calls when the call ends, usually within a minute or two. To check it earlier, call \`app_retell_get_call\` with the returned \`callId\`.
5. When a tool returns an error from Retell (country not supported, number without SMS, do-not-call), report the message as it is; do not retry with other numbers on your own.
6. Use \`app_retell_set_dnc\` only on an explicit request ("they asked us not to call"), and propose it for approval.

## Building workflows with these actions

Each tool is also a workflow step. Add it as a LOGIC_FUNCTION step: find its id with \`list_logic_function_tools\` (names \`retell-call-person\`, \`retell-send-sms\`, \`retell-get-call\`, \`retell-set-dnc\`) and pass it as settings.input.logicFunctionId; fill the step input from earlier steps, for example \`{{trigger.record.id}}\` for personId. Load the workflow-building skill first.

Common recipes:
- **New lead, call back**: trigger DATABASE_EVENT on person created (or opportunity created, then use its pointOfContact as the person) -> optional filter on source or stage -> retell-call-person with personId and opportunityId.
- **Missed call, text back**: trigger on retellCall created -> filter direction INBOUND and a short durationMs or a disconnectionReason such as voicemail -> retell-send-sms to the call's person.
- **Follow-up task**: trigger on retellCall created -> filter successful is false or sentiment Negative -> CREATE_RECORD task linked to the call's person, with the summary in the body.
- **Do-not-call from your own field**: trigger on person updated with your field -> retell-set-dnc with the new value.
- **Scheduled re-check**: CRON trigger -> find calls without summary -> retell-get-call for each.

A workflow runs without approval, so tell the user plainly that an activated "call" or "SMS" workflow will contact people automatically, and suggest testing it on one record before activating.`;

export default defineSkill({
  universalIdentifier: RETELL_SKILL_UNIVERSAL_IDENTIFIER,
  name: 'retell',
  label: 'Retell calls and SMS',
  description:
    'Use for anything about Retell AI calls, SMS chats, voice agents, calling or texting a person, do-not-call, ' +
    'or workflows that call, text or follow up on calls.',
  icon: 'IconPhoneCall',
  content: CONTENT,
});
