import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import { OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/standard-objects';
import {
  CALL_OBJECT_UNIVERSAL_IDENTIFIER,
  CALL_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER,
  OPPORTUNITY_CALLS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: OPPORTUNITY_CALLS_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'retellCalls',
  label: 'Retell Calls',
  icon: 'IconPhoneCall',
  relationTargetObjectMetadataUniversalIdentifier: CALL_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: CALL_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
