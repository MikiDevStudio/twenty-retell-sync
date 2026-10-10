export const APP_DISPLAY_NAME = 'Retell Sync for Twenty';
export const APP_DESCRIPTION =
  'Every Retell AI call and SMS chat lands in Twenty within seconds, with summary, transcript and recording, linked to the right Person and Opportunity. Call or text a Person from a workflow or the AI chat, and keep do-not-call in sync both ways.';
export const APPLICATION_UNIVERSAL_IDENTIFIER = 'd64b5231-682b-433f-a201-3ff75d02fce2';
export const DEFAULT_ROLE_UNIVERSAL_IDENTIFIER = 'ecc5546d-1441-42d6-94db-63bc38d8c51e';
export const HEALTH_CHECK_UNIVERSAL_IDENTIFIER = 'ebd98627-fb8a-410f-89c8-4f9fc3950f1b';

export const CALL_OBJECT_UNIVERSAL_IDENTIFIER =
  '5620c9c9-eb86-4d6e-8a55-984a1a10bfab';
export const CHAT_OBJECT_UNIVERSAL_IDENTIFIER =
  '8f36e64d-08a1-4176-9490-be534212268e';
export const PERSON_CALLS_FIELD_UNIVERSAL_IDENTIFIER =
  'fe6de734-b0c0-42a4-8481-ebe918f6c86a';
export const CALL_PERSON_FIELD_UNIVERSAL_IDENTIFIER =
  '2dd580de-9d62-41de-81a8-074b59594bd9';
export const PERSON_CHATS_FIELD_UNIVERSAL_IDENTIFIER =
  '97480f62-cb19-48ae-9ece-4e3eacb523ea';
export const CHAT_PERSON_FIELD_UNIVERSAL_IDENTIFIER =
  'bc460ae5-b30a-43f6-8da4-e14440759a18';
export const WEBHOOK_FN_UNIVERSAL_IDENTIFIER =
  '09c13676-01f0-4587-80eb-193cd7f971d9';
export const SYNC_FN_UNIVERSAL_IDENTIFIER =
  '69723493-26c0-4e81-86c3-22a61536bf7e';
export const VAR_RETELL_API_KEY_UNIVERSAL_IDENTIFIER =
  '63ad0bd1-28d0-4a05-b2ce-3c9982c6b7c3';
export const VAR_BACKFILL_DAYS_UNIVERSAL_IDENTIFIER =
  '5a535516-85f3-4fa3-9606-f54b83c817f4';
export const VAR_CREATE_PEOPLE_UNIVERSAL_IDENTIFIER =
  '94f33e47-b265-4ed3-b2b6-4e67861570c8';
export const VAR_LINK_LATEST_OPPORTUNITY_UNIVERSAL_IDENTIFIER =
  'bffa5ed1-f3a9-44d4-8504-4d6c4491f66a';
export const VAR_EXCLUDE_FIELDS_UNIVERSAL_IDENTIFIER =
  'db09153d-1769-4d7a-b5fa-4b571fed3987';

export const CALL_FIELD_IDS = {
  callId: 'df92cdd0-3303-41b1-b407-4221d7719c3b',
  agentId: 'c3971c50-3053-4473-9754-5a4749dfa5da',
  agentName: 'f6ab70ef-c3ce-4c62-a7dd-22d6b99ee69e',
  direction: 'd09f3905-3236-4cdc-83d5-f594bab60e75',
  callType: '854bcfbe-f7f1-4e31-8042-eee979eacfe4',
  callStatus: '321fd9e3-cb76-49ff-ab76-94490bd3d8f4',
  fromNumber: 'bc8d054e-0071-42b1-a7c5-a861f81adff7',
  toNumber: '8d7666cb-a541-4481-86ac-c3f537e66dff',
  startedAt: '83d58998-e6dc-4284-a486-95bf10dd4422',
  endedAt: 'ad861d78-b0c3-470f-9bdf-620a9ae88825',
  durationMs: 'df2557c0-fbf9-40b1-88df-9eadeda34f7f',
  disconnectionReason: 'b798ccff-1c0a-40ec-af95-304b632a4dec',
  summary: '19c112a4-b9c8-483b-9515-566216aadd92',
  sentiment: '1c224991-ee5e-450c-9d10-16d186558ff2',
  successful: '3bf658b6-0b28-4261-8385-3df2643af89c',
  inVoicemail: '24163d32-8704-4f01-84e0-c7a4b2069455',
  transcript: 'fa0844c1-2e97-4a4f-9853-5927b83c5ebe',
  analysis: '0c2d0f9a-ffa6-45a8-a0e8-013da1c529a7',
  dynamicVariables: 'b77f5405-c8e4-4bd9-aaec-a19a8e5e7021',
  metadata: 'ac31d231-8e42-471e-95fe-0a5534e9f9cc',
  costCents: '0444a056-1fca-4503-a890-d8a9643283c3',
  recording: '6c62b2dc-41a8-467b-b49a-7abbd0c768e8',
  connection: 'b0c0407a-90b0-42c1-9880-b2e7e0c6eca7',
  transferred: '0cc029a5-560a-46fd-abe6-daf0c85f6168',
  latencyP50Ms: '6a04598e-ef0f-4162-9387-635a50d84163',
  durationSeconds: '4579eebf-9059-49db-bf29-2c581bddcfa7',
  costDollars: 'd33b949f-e170-4492-857f-763d4159ec29',
} as const;

export const CHAT_FIELD_IDS = {
  chatId: '06ae6b2c-7943-4948-820e-4b696f168a23',
  agentId: 'f116c868-dba3-47d3-96e9-822444f645aa',
  agentName: 'bbcee01d-f592-46e5-83bf-64c6403bbe9a',
  chatType: '8310ea31-a5f6-484b-81e9-b4c7562a946e',
  chatStatus: '54af79c2-6fda-4526-accb-28604dda434d',
  userNumber: '47d5e5eb-18ff-4b1a-9a3c-6cb2cb358316',
  startedAt: '0c784b72-6d3e-468f-b763-12c7118a198e',
  endedAt: '49625832-ee3e-4aaf-b718-b690021f00ba',
  durationMs: 'ac1b4250-f256-4480-86a8-0808826dd9bc',
  summary: 'c53bcb84-699f-4645-8c43-258a5e890713',
  sentiment: '983e8509-b431-406f-ae67-be14647352d7',
  successful: 'f8f4a007-678f-470e-9544-2100ff7a06d6',
  transcript: 'b47a100c-b247-43fb-a39b-d183df9f6357',
  analysis: '718b3c41-027a-4753-8f7d-32560f2e7640',
  dynamicVariables: '70bbe384-205b-4fb7-a53a-cdc352ce0ef0',
  metadata: 'a167ffd8-e2ce-46c1-bd8c-35436d98e1c8',
  costCents: '873b4a0c-2e9e-4070-bd3c-22d252f70aa1',
  durationSeconds: '491a908b-2a9c-458e-b06e-963371114e1a',
  costDollars: 'ab199fe3-4796-4e85-a02a-9a44809f2621',
} as const;

export const SYNC_CRON_FN_UNIVERSAL_IDENTIFIER = '597f5991-4b83-40f7-a614-4856bae5f13a';
export const STATUS_FN_UNIVERSAL_IDENTIFIER = '24cc1096-3ccf-42b1-b26d-29753223febd';
export const SETTINGS_FN_UNIVERSAL_IDENTIFIER = '4c020a98-619c-4d7f-84d5-ef3623936cd0';
export const CONNECT_FN_UNIVERSAL_IDENTIFIER = '3e024e38-70d4-464d-8a5b-d1701e76c01f';
export const SETTINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER = '80b0a0bf-5850-4cf8-876c-2885d1d65fb4';
export const SETTINGS_MENU_ITEM_UNIVERSAL_IDENTIFIER = '27a574a7-af41-4df8-8252-b4c171aba75d';
export const TRANSCRIPT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER = 'db034b1f-fed8-45d4-b498-00874eca08ee';
export const CALL_TRANSCRIPT_TAB_UNIVERSAL_IDENTIFIER = '2b4125ad-a78c-439e-aebe-345b8e850d22';
export const CHAT_TRANSCRIPT_TAB_UNIVERSAL_IDENTIFIER = '9bed5e97-dd8f-443a-8cfb-49af81e675aa';
export const CALL_TRANSCRIPT_WIDGET_UNIVERSAL_IDENTIFIER = 'bd11ddc3-1501-4c87-a03a-aaede294796b';
export const CHAT_TRANSCRIPT_WIDGET_UNIVERSAL_IDENTIFIER = '212b2b33-bab5-4a0b-ac32-f609510d5393';
export const RESYNC_FN_UNIVERSAL_IDENTIFIER = '00c98d90-202c-47a3-8b33-0ad3725d9680';
export const CALL_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER = 'a09f86d8-d803-482f-ab47-62f0a1ebb4ff';
export const CHAT_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER = '91a34c81-87f0-4cf0-b4ea-5da0e81cb8c8';
export const OPPORTUNITY_CALLS_FIELD_UNIVERSAL_IDENTIFIER = '7ed1ef86-c1ad-4a37-89c1-ff8341fd533d';
export const OPPORTUNITY_CHATS_FIELD_UNIVERSAL_IDENTIFIER = 'a302b47d-d8fc-45fb-aaff-85a165c0c337';
export const CALL_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER = '41ec2bc3-64f7-4b00-a200-35b0b2fc4f99';
export const CHAT_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER = '106b1ca1-29a0-4af0-b5bb-a8c24e70aa44';
export const PERSON_DO_NOT_CALL_FIELD_UNIVERSAL_IDENTIFIER = 'c940d39b-b7ce-48af-b3fc-4e5715d9ca58';
export const PERSON_DO_NOT_CALL_AT_FIELD_UNIVERSAL_IDENTIFIER = '6bba93a0-30d8-40fe-be2e-746e239473f6';
export const PERSON_DO_NOT_CALL_SOURCE_FIELD_UNIVERSAL_IDENTIFIER = 'e90cdacd-fceb-4cc1-a2a5-f0de9a7d8556';
export const PERSON_RETELL_CONTACT_ID_FIELD_UNIVERSAL_IDENTIFIER = '84ddda6a-b0b0-405f-a4f8-50503d40aba4';
export const PERSON_LAST_CONTACTED_AT_FIELD_UNIVERSAL_IDENTIFIER = '963cf1d2-55f2-489b-bcb3-fa10c5ff8f5a';
export const DNC_CHANGED_FN_UNIVERSAL_IDENTIFIER = '81ae4e23-5031-48f5-b59b-f7ab6738a86b';
export const SET_DNC_FN_UNIVERSAL_IDENTIFIER = '22b8dcdd-7700-4328-a4b5-65084ea47bac';
export const GET_CALL_FN_UNIVERSAL_IDENTIFIER = 'ebcb0e71-2ce9-4455-adab-ffd78b79bd60';
export const CALL_PERSON_FN_UNIVERSAL_IDENTIFIER = '55a4261c-98d4-466a-8ee7-c7c1f3bb2504';
export const SEND_SMS_FN_UNIVERSAL_IDENTIFIER = 'b9a16efe-6afa-435f-960e-ac5f137d1851';
export const RETELL_SKILL_UNIVERSAL_IDENTIFIER = 'f59984d0-ca9d-460c-9c7d-30cd66bc56c7';

export const ANALYTICS_LAYOUT_UNIVERSAL_IDENTIFIER = 'a956da3a-c54b-4b74-a947-541c18611e4a';
export const ANALYTICS_CALLS_TAB_UNIVERSAL_IDENTIFIER = '9d8a2833-ae67-4534-b6b8-2f87563c8373';
export const ANALYTICS_CHATS_TAB_UNIVERSAL_IDENTIFIER = 'ea77cf9d-fb49-4419-b72d-3c2c6c934d44';
export const ANALYTICS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER = '6a155552-6382-49a8-a992-f1ad231ce484';

export const ANALYTICS_WIDGET_IDS = {
  callsCount: '7f06ba3d-4037-42a7-bac4-8f14ef6f5d0a',
  callsAvgDuration: '00a3d52d-7457-4b31-8c04-bc5bce564236',
  callsLatencyP50: '25becef8-284d-42be-882b-28dd91cb7c37',
  callsTotalCost: '1dc96cdb-90a5-4234-b798-e86065b8bb25',
  callsPickedUpRate: '916d4d96-59b6-4600-9da9-02edb1b1ebd5',
  callsTransferred: '75f8bb0e-eca6-467d-9d37-267a378ff9fb',
  callsVoicemail: 'a2e401c1-c026-489d-aee6-ef9060d5f30e',
  callsPerDay: 'edd3d1bf-ce13-4ee1-ac0d-05e06efe8a00',
  callsConnectionByDay: '646fb8f4-a289-4cd5-a95c-7090bd3d6bea',
  callsSuccessful: '65bd93c8-24c5-4fb6-b53a-ba4c692b0f77',
  callsSentiment: '35a971cc-d79c-4bc6-9635-ca34e209ad95',
  callsDirection: 'fdf6e4bc-3640-4401-8feb-07fde1883d1a',
  callsDisconnectionReason: 'c1b782a8-f781-4876-9f77-ad7a1261b3e8',
  chatsCount: '547a7835-127c-44cd-b25c-513938a76b46',
  chatsAvgDuration: '6fe8db5c-c108-4f4a-8028-bfb7574dbf1b',
  chatsTotalCost: '51b07f66-bd30-47e7-85f9-b2d2a7fbf20a',
  chatsPerDay: '03ed83e9-8dce-42c2-b0a9-bf2c7628146e',
  chatsSuccessful: '9ee381c4-af5d-4dc4-82ba-d7eac503e9a7',
  chatsSentiment: 'ec8c697c-032e-44c8-8fe0-a8df8e59156b',
} as const;
