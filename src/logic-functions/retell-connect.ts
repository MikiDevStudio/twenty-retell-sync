import { defineLogicFunction } from 'twenty-sdk/define';
import { Response, type RoutePayload } from 'twenty-sdk/logic-function';

import { CONNECT_FN_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { listAgents, setAgentWebhook } from 'src/lib/retell-api';
import { isPublicUrl } from 'src/lib/settings';
import { getSettings, resolveBaseUrl, resolveWebhookUrl } from 'src/lib/settings-store';

type Body = { remove?: boolean; agentIds?: string[] };

// Registers this app's webhook URL on Retell agents (or removes it again), so nobody has to paste it
// into the Retell dashboard. Agent-level webhooks override the account-level one for that agent.
const handler = async (route: RoutePayload<Body>) => {
  const remove = route.body?.remove === true;
  const settings = await getSettings();
  const webhookUrl = resolveWebhookUrl(settings);

  if (!remove && !isPublicUrl(resolveBaseUrl(settings))) {
    return new Response(
      `Webhook URL ${webhookUrl} is not reachable from the internet. Set the public URL of this Twenty server on the Retell tab.`,
      { status: 400 },
    );
  }

  const wanted = route.body?.agentIds ?? settings.agentIds;
  const agents = (await listAgents()).filter((agent) => wanted.length === 0 || wanted.includes(agent.agent_id));

  const results = [];
  for (const agent of agents) {
    try {
      await setAgentWebhook(agent, remove ? null : webhookUrl);
      results.push({ id: agent.agent_id, name: agent.agent_name ?? agent.agent_id, channel: agent.channel, ok: true });
    } catch (e) {
      results.push({
        id: agent.agent_id,
        name: agent.agent_name ?? agent.agent_id,
        channel: agent.channel,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { webhookUrl, removed: remove, results };
};

export default defineLogicFunction({
  universalIdentifier: CONNECT_FN_UNIVERSAL_IDENTIFIER,
  name: 'retell-connect',
  description: 'Sets or removes the webhook URL on Retell agents',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: '/retell/connect', httpMethod: 'POST', isAuthRequired: true },
});
