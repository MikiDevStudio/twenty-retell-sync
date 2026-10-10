import {
  definePageLayoutTab,
  getSystemRecordPageLayoutUniversalIdentifier,
  PageLayoutTabLayoutMode,
} from 'twenty-sdk/define';

import {
  APPLICATION_UNIVERSAL_IDENTIFIER,
  CHAT_OBJECT_UNIVERSAL_IDENTIFIER,
  CHAT_TRANSCRIPT_TAB_UNIVERSAL_IDENTIFIER,
  CHAT_TRANSCRIPT_WIDGET_UNIVERSAL_IDENTIFIER,
  TRANSCRIPT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default definePageLayoutTab({
  universalIdentifier: CHAT_TRANSCRIPT_TAB_UNIVERSAL_IDENTIFIER,
  pageLayoutUniversalIdentifier: getSystemRecordPageLayoutUniversalIdentifier({
    objectMetadataApplicationUniversalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
    objectUniversalIdentifier: CHAT_OBJECT_UNIVERSAL_IDENTIFIER,
  }),
  title: 'Summary',
  position: 15,
  icon: 'IconFileDescription',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: CHAT_TRANSCRIPT_WIDGET_UNIVERSAL_IDENTIFIER,
      title: 'Summary',
      type: 'FRONT_COMPONENT',
      heightBehavior: 'TAB_VIEWPORT',
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier: TRANSCRIPT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      },
    },
  ],
});
