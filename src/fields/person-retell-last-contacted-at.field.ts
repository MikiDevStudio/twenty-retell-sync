import { defineField, FieldType } from 'twenty-sdk/define';

import { PERSON_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/standard-objects';
import { PERSON_LAST_CONTACTED_AT_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_LAST_CONTACTED_AT_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.DATE_TIME,
  name: 'retellLastContactedAt',
  label: 'Retell last contacted at',
  description: 'Start of the newest Retell call or chat with this person',
  icon: 'IconClock',
});
