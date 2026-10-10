import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import { PERSON_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/standard-objects';
import {
  CALL_OBJECT_UNIVERSAL_IDENTIFIER,
  CALL_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  PERSON_CALLS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_CALLS_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'retellCalls',
  label: 'Retell Calls',
  icon: 'IconPhoneCall',
  relationTargetObjectMetadataUniversalIdentifier: CALL_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: CALL_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
