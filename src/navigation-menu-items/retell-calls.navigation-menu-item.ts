import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import {
  CALL_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  CALL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: CALL_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: CALL_OBJECT_UNIVERSAL_IDENTIFIER,
  icon: 'IconPhoneCall',
  position: 100,
});
