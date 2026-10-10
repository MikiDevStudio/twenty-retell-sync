import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  ANALYTICS_LAYOUT_UNIVERSAL_IDENTIFIER,
  ANALYTICS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: ANALYTICS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Retell Analytics',
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: ANALYTICS_LAYOUT_UNIVERSAL_IDENTIFIER,
  icon: 'IconChartBar',
  position: 99,
});
