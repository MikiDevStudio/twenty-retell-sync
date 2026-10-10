import { callPhone, chatPhone, mapCall, mapChat, opportunityIdOf, parseExcluded, personName } from 'src/lib/mapping';
import { afterSave } from 'src/lib/dnc-sync';
import { CALL_KIND, CHAT_KIND, upsert, type UpsertResult } from 'src/lib/store';

type Retell = Record<string, any>;

const excluded = () => parseExcluded(process.env.SYNC_EXCLUDE_FIELDS);

// Both switches are on unless the Retell tab sets the variable to false; an unset or blank value counts as on.
const isOn = (value: string | undefined): boolean => (value ?? '').trim().toLowerCase() !== 'false';

export const createsPeople = (value: string | undefined = process.env.CREATE_PEOPLE): boolean => isOn(value);

export const linksLatestOpportunity = (value: string | undefined = process.env.LINK_LATEST_OPPORTUNITY): boolean => isOn(value);

const linkFor = (record: Retell, phone: string | null) => ({
  phone,
  newPerson: createsPeople() && phone ? personName(record, phone) : undefined,
  opportunityId: opportunityIdOf(record),
  linkLatestOpportunity: linksLatestOpportunity(),
});

export const saveCall = async (call: Retell): Promise<UpsertResult> => {
  const phone = callPhone(call);
  const saved = await upsert(CALL_KIND, call.call_id, mapCall(call, excluded()), linkFor(call, phone));
  await afterSave(saved.personId, call, true);
  return saved.result;
};

export const saveChat = async (chat: Retell): Promise<UpsertResult> => {
  const phone = chatPhone(chat);
  const saved = await upsert(CHAT_KIND, chat.chat_id, mapChat(chat, excluded()), linkFor(chat, phone));
  await afterSave(saved.personId, chat, false);
  return saved.result;
};
