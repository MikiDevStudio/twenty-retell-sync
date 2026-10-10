import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import { PERSON_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/standard-objects';
import {
  CHAT_OBJECT_UNIVERSAL_IDENTIFIER,
  CHAT_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  PERSON_CHATS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_CHATS_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'retellChats',
  label: 'Retell Chats',
  icon: 'IconMessageCircle',
  relationTargetObjectMetadataUniversalIdentifier: CHAT_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: CHAT_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
