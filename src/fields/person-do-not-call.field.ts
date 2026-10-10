import { defineField, FieldType } from 'twenty-sdk/define';

import { PERSON_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/standard-objects';
import { PERSON_DO_NOT_CALL_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_DO_NOT_CALL_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.BOOLEAN,
  name: 'retellDoNotCall',
  label: 'Retell do not call',
  description: 'Mirrors the do-not-call flag of the contact in Retell; it stops outbound calls and SMS that honour it',
  icon: 'IconPhoneOff',
  defaultValue: false,
});
