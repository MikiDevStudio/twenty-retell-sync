import { defineObject, FieldType, OnDeleteAction, RelationType } from 'twenty-sdk/define';

import { OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER, PERSON_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/standard-objects';
import {
  CHAT_FIELD_IDS as F,
  CHAT_OBJECT_UNIVERSAL_IDENTIFIER,
  CHAT_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER,
  CHAT_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  OPPORTUNITY_CHATS_FIELD_UNIVERSAL_IDENTIFIER,
  PERSON_CHATS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import { SENTIMENT_OPTIONS } from 'src/objects/sentiment-options';

export default defineObject({
  universalIdentifier: CHAT_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'retellChat',
  namePlural: 'retellChats',
  labelSingular: 'Retell Chat',
  labelPlural: 'Retell Chats',
  description: 'An SMS or web chat handled by a Retell AI chat agent',
  icon: 'IconMessageCircle',
  fields: [
    { universalIdentifier: F.chatId, name: 'chatId', type: FieldType.TEXT, label: 'Chat ID', icon: 'IconKey' },
    { universalIdentifier: F.agentId, name: 'agentId', type: FieldType.TEXT, label: 'Agent ID', icon: 'IconRobot' },
    { universalIdentifier: F.agentName, name: 'agentName', type: FieldType.TEXT, label: 'Agent name', icon: 'IconRobot' },
    { universalIdentifier: F.chatType, name: 'chatType', type: FieldType.TEXT, label: 'Chat type', icon: 'IconMessage' },
    { universalIdentifier: F.chatStatus, name: 'chatStatus', type: FieldType.TEXT, label: 'Chat status', icon: 'IconActivity' },
    { universalIdentifier: F.userNumber, name: 'userNumber', type: FieldType.TEXT, label: 'User number', icon: 'IconPhone' },
    { universalIdentifier: F.startedAt, name: 'startedAt', type: FieldType.DATE_TIME, label: 'Started at', icon: 'IconClock' },
    { universalIdentifier: F.endedAt, name: 'endedAt', type: FieldType.DATE_TIME, label: 'Ended at', icon: 'IconClockStop' },
    { universalIdentifier: F.durationMs, name: 'durationMs', type: FieldType.NUMBER, label: 'Duration (ms)', icon: 'IconHourglass' },
    { universalIdentifier: F.summary, name: 'summary', type: FieldType.TEXT, label: 'Summary', icon: 'IconFileDescription' },
    { universalIdentifier: F.sentiment, name: 'sentiment', type: FieldType.SELECT, label: 'User sentiment', icon: 'IconMoodSmile', options: SENTIMENT_OPTIONS },
    { universalIdentifier: F.successful, name: 'successful', type: FieldType.BOOLEAN, label: 'Successful', icon: 'IconCheck', isNullable: true, defaultValue: null },
    { universalIdentifier: F.transcript, name: 'transcript', type: FieldType.RICH_TEXT, label: 'Transcript', icon: 'IconMessages' },
    { universalIdentifier: F.analysis, name: 'analysis', type: FieldType.RAW_JSON, label: 'Custom analysis data', icon: 'IconBraces' },
    { universalIdentifier: F.dynamicVariables, name: 'dynamicVariables', type: FieldType.RAW_JSON, label: 'Dynamic variables', icon: 'IconBraces' },
    { universalIdentifier: F.metadata, name: 'metadata', type: FieldType.RAW_JSON, label: 'Metadata', icon: 'IconBraces' },
    { universalIdentifier: F.costCents, name: 'costCents', type: FieldType.NUMBER, label: 'Cost (cents)', icon: 'IconCoin' },
    {
      universalIdentifier: CHAT_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'person',
      type: FieldType.RELATION,
      label: 'Person',
      icon: 'IconUser',
      relationTargetObjectMetadataUniversalIdentifier: PERSON_OBJECT_UNIVERSAL_IDENTIFIER,
      relationTargetFieldMetadataUniversalIdentifier: PERSON_CHATS_FIELD_UNIVERSAL_IDENTIFIER,
      universalSettings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: OnDeleteAction.SET_NULL,
        joinColumnName: 'personId',
      },
    },
    {
      universalIdentifier: CHAT_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'opportunity',
      type: FieldType.RELATION,
      label: 'Opportunity',
      icon: 'IconTargetArrow',
      relationTargetObjectMetadataUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
      relationTargetFieldMetadataUniversalIdentifier: OPPORTUNITY_CHATS_FIELD_UNIVERSAL_IDENTIFIER,
      universalSettings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: OnDeleteAction.SET_NULL,
        joinColumnName: 'opportunityId',
      },
    },
  ],
});
