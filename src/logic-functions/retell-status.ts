import { defineLogicFunction } from 'twenty-sdk/define';

import { STATUS_FN_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { getAgentWebhook, listAgents, listPhoneNumbers } from 'src/lib/retell-api';
import { isPublicUrl } from 'src/lib/settings';
import {
  getLastRunAt,
  getLastSync,
  getResyncJob,
  getLastRejectedAt,
  getLastRejectedReason,
  getLastWebhookAt,
  getSettings,
  resolveBaseUrl,
  resolveWebhookUrl,
} from 'src/lib/settings-store';

// Stars plus the last four characters: enough to tell two keys apart in the Retell dashboard.
const maskKey = (key: string | undefined): string | null =>
  key ? `${'*'.repeat(Math.max(key.length - 4, 8))}${key.slice(-4)}` : null;

// Everything the Retell tab shows. The Retell key never leaves the server, so the tab asks here.
const handler = async () => {
  const settings = await getSettings();
  const webhookUrl = resolveWebhookUrl(settings);

  let connected = false;
  let error: string | undefined;
  let agents: { id: string; name: string; channel: string; hasWebhook: boolean; webhookUrl: string | null }[] = [];
  let phoneNumbers: { number: string; nickname: string | null; hasOutboundAgent: boolean; hasSmsAgent: boolean }[] = [];

  if (process.env.RETELL_API_KEY) {
    try {
      const listed = await listAgents();
      connected = true;
      agents = await Promise.all(
        listed.map(async (agent) => {
          const current = await getAgentWebhook(agent).catch(() => null);
          return {
            id: agent.agent_id,
            name: agent.agent_name ?? agent.agent_id,
            channel: agent.channel,
            hasWebhook: current === webhookUrl,
            webhookUrl: current,
          };
        }),
      );
      // Optional for the tab: a failure here must not mark the connection as broken.
      phoneNumbers = (await listPhoneNumbers().catch(() => [])).map((number) => ({
        number: number.phone_number,
        nickname: number.nickname ?? null,
        hasOutboundAgent: (number.outbound_agents ?? []).length > 0,
        hasSmsAgent: (number.outbound_sms_agents ?? []).length > 0,
      }));
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  } else {
    error = 'RETELL_API_KEY is not set. Enter it in the Retell API key section above.';
  }

  const lastRunAt = await getLastRunAt();

  return {
    connected,
    keyIsSet: Boolean(process.env.RETELL_API_KEY),
    keyMask: maskKey(process.env.RETELL_API_KEY),
    error,
    settings,
    webhookUrl,
    webhookUrlIsPublic: isPublicUrl(resolveBaseUrl(settings)),
    lastSync: await getLastSync(),
    resync: await getResyncJob(),
    lastWebhookAt: await getLastWebhookAt(),
    lastRejectedAt: await getLastRejectedAt(),
    lastRejectedReason: await getLastRejectedReason(),
    nextRunAt: lastRunAt === null ? null : lastRunAt + settings.intervalMinutes * 60_000,
    agents,
    phoneNumbers,
  };
};

export default defineLogicFunction({
  universalIdentifier: STATUS_FN_UNIVERSAL_IDENTIFIER,
  name: 'retell-status',
  description: 'Connection, settings, agents and last sync for the Retell settings tab',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: { path: '/retell/status', httpMethod: 'GET', isAuthRequired: true },
});
