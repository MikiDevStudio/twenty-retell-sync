import { defineFrontComponent } from 'twenty-sdk/define';

import { RetellSettings } from 'src/components/retell-settings-view';
import { SETTINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

// Keep this file free of JSX: the SDK finds entities by parsing every file as plain TypeScript, and a
// large JSX body makes that parse swallow the default export, so the component silently disappears.
export default defineFrontComponent({
  universalIdentifier: SETTINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'retell-settings',
  description: 'Retell connection, webhook and sync schedule',
  component: RetellSettings,
});
