import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  CHAT_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  CHAT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: CHAT_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: CHAT_OBJECT_UNIVERSAL_IDENTIFIER,
  icon: 'IconMessageCircle',
  position: 101,
});
