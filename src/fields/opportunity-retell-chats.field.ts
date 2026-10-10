import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import { OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/standard-objects';
import {
  CHAT_OBJECT_UNIVERSAL_IDENTIFIER,
  CHAT_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER,
  OPPORTUNITY_CHATS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: OPPORTUNITY_CHATS_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'retellChats',
  label: 'Retell Chats',
  icon: 'IconMessageCircle',
  relationTargetObjectMetadataUniversalIdentifier: CHAT_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: CHAT_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
