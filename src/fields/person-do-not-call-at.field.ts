import { defineField, FieldType } from 'twenty-sdk/define';

import { PERSON_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/standard-objects';
import { PERSON_DO_NOT_CALL_AT_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_DO_NOT_CALL_AT_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.DATE_TIME,
  name: 'retellDoNotCallAt',
  label: 'Retell do not call changed at',
  description: 'When the do-not-call flag last changed',
  icon: 'IconClockOff',
});
