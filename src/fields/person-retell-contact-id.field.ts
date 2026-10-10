import { defineField, FieldType } from 'twenty-sdk/define';

import { PERSON_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/standard-objects';
import { PERSON_RETELL_CONTACT_ID_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: PERSON_RETELL_CONTACT_ID_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.TEXT,
  name: 'retellContactId',
  label: 'Retell contact ID',
  description: 'Identifier of this person\'s contact in Retell',
  icon: 'IconKey',
});
