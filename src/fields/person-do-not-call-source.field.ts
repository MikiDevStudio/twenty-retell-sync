import { defineField, FieldType } from 'twenty-sdk/define';

import { DNC_SOURCE } from 'src/lib/dnc';
import { PERSON_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/standard-objects';
import { PERSON_DO_NOT_CALL_SOURCE_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_DO_NOT_CALL_SOURCE_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.SELECT,
  name: 'retellDoNotCallSource',
  label: 'Retell do not call source',
  description: 'Where the last change of the do-not-call flag came from',
  icon: 'IconInfoCircle',
  options: [
    { value: DNC_SOURCE.call, label: 'Retell: asked on a call', position: 0, color: 'red' },
    { value: DNC_SOURCE.contact, label: 'Retell: contact (SMS opt-out or dashboard)', position: 1, color: 'orange' },
    { value: DNC_SOURCE.twenty, label: 'Twenty', position: 2, color: 'gray' },
  ],
});
