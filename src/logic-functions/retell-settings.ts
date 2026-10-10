import { defineLogicFunction } from 'twenty-sdk/define';
import type { RoutePayload } from 'twenty-sdk/logic-function';

import { SETTINGS_FN_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import type { Settings } from 'src/lib/settings';
import { saveSettings } from 'src/lib/settings-store';

const handler = async (route: RoutePayload<Partial<Settings>>) => ({
  settings: await saveSettings(route.body ?? {}),
});

export default defineLogicFunction({
  universalIdentifier: SETTINGS_FN_UNIVERSAL_IDENTIFIER,
  name: 'retell-settings',
  description: 'Saves sync interval, public URL, agent selection and outbound defaults from the Retell tab',
  timeoutSeconds: 15,
  handler,
  httpRouteTriggerSettings: { path: '/retell/settings', httpMethod: 'POST', isAuthRequired: true },
});
