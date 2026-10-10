import { defineLogicFunction } from 'twenty-sdk/define';
import { Response, type RoutePayload } from 'twenty-sdk/logic-function';

import { WEBHOOK_FN_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { saveCall, saveChat } from 'src/lib/save';
import { setLastRejected, setLastWebhookAt } from 'src/lib/settings-store';
import { explainRejection, rawBodyOf, verifyRetellSignature } from 'src/lib/signature';

// Retell events that carry a call or chat worth storing. call_ended has no analysis yet and
// call_analyzed completes the same record, so both go through the same upsert.
const CALL_EVENTS = new Set(['call_ended', 'call_analyzed']);
const CHAT_EVENTS = new Set(['chat_ended', 'chat_analyzed']);

const handler = async (route: RoutePayload) => {
  const body = rawBodyOf(route);
  const rawBody = body.text;
  const signature = route.headers['x-retell-signature'];

  if (!verifyRetellSignature(rawBody, process.env.RETELL_API_KEY ?? '', signature)) {
    await setLastRejected(Date.now(), explainRejection(signature, process.env.RETELL_API_KEY ?? '', body));
    return new Response('Unauthorized', { status: 401 });
  }

  // Shown on the Retell tab as proof that Retell reaches this server.
  await setLastWebhookAt(Date.now());

  const { event, call, chat } = JSON.parse(rawBody) as {
    event?: string;
    call?: Record<string, any>;
    chat?: Record<string, any>;
  };

  if (event && CALL_EVENTS.has(event) && call?.call_id) {
    return { event, id: call.call_id, result: await saveCall(call) };
  }
  if (event && CHAT_EVENTS.has(event) && chat?.chat_id) {
    return { event, id: chat.chat_id, result: await saveChat(chat) };
  }

  return { event, result: 'ignored' };
};

export default defineLogicFunction({
  universalIdentifier: WEBHOOK_FN_UNIVERSAL_IDENTIFIER,
  name: 'retell-webhook',
  description: 'Receives Retell call and chat webhooks and stores them in Twenty',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/retell/webhook',
    httpMethod: 'POST',
    isAuthRequired: false,
    forwardedRequestHeaders: ['x-retell-signature'],
  },
});
