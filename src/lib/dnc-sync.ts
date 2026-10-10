import {
  DNC_SOURCE,
  dncWrite,
  e164Of,
  flagFromCall,
  newerContact,
  reconcile,
  resolveCheck,
  type DncContact,
  type DncPerson,
} from 'src/lib/dnc';
import { getContactByPhone, listDncContacts, setContactDnc } from 'src/lib/retell-api';
import { findPersonId, findTrackedDncPeople, getPerson, updatePerson, type AppPerson } from 'src/lib/store';

type Retell = Record<string, any>;

// After a call or chat is stored: move the Person's last contact time forward and, for a call that ended
// with a do-not-call request, flag the Person. The call is already saved, so a failure here must not undo it.
export const afterSave = async (personId: string | null, record: Retell, isCall: boolean): Promise<void> => {
  if (!personId) return;
  try {
    const person = await getPerson(personId);
    if (!person) return;

    const lastContacted = newerContact(person.retellLastContactedAt, record.start_timestamp);
    const flag = isCall ? flagFromCall(record, person) : null;
    const data = { ...(lastContacted ? { retellLastContactedAt: lastContacted } : {}), ...(flag ?? {}) };
    if (Object.keys(data).length > 0) await updatePerson(personId, data);
  } catch {
    // The reconcile on the next sync picks up a missed flag from the Retell contact.
  }
};

export type PushResult = 'sent' | 'no-phone';

// Sends the Person's flag to Retell and keeps the contact id for later.
export const pushToRetell = async (person: DncPerson, value: boolean): Promise<PushResult> => {
  const e164 = e164Of(person.phones);
  if (!e164) return 'no-phone';
  const contact = await setContactDnc(e164, value);
  if (contact && contact.contact_id !== person.retellContactId) {
    await updatePerson(person.id, { retellContactId: contact.contact_id });
  }
  return 'sent';
};

// A change made in Twenty: stamp it and pass it on to Retell.
export const applyTwentyChange = async (person: DncPerson, value: boolean, now = Date.now()): Promise<PushResult> => {
  await updatePerson(person.id, dncWrite(value, now, DNC_SOURCE.twenty));
  return pushToRetell(person, value);
};

export type DncReport = { flagged: number; pushed: number; cleared: number; failed: number; error?: string };

// Retell sends no webhook when a contact changes (SMS opt-out, the dashboard), so each sync compares both sides.
export const reconcileDnc = async (now = Date.now()): Promise<DncReport> => {
  const report: DncReport = { flagged: 0, pushed: 0, cleared: 0, failed: 0 };

  const contacts = await listDncContacts();
  const matched: { contact: DncContact; person: AppPerson }[] = [];
  for (const contact of contacts) {
    const personId = await findPersonId(contact.phone_number);
    const person = personId ? await getPerson(personId) : null;
    if (person) matched.push({ contact, person });
  }

  for (const action of reconcile(matched, await findTrackedDncPeople(), now)) {
    try {
      if (action.kind === 'flag') {
        await updatePerson(action.personId, { ...action.write, retellContactId: action.contactId });
        report.flagged++;
      } else if (action.kind === 'contact-id') {
        await updatePerson(action.personId, { retellContactId: action.contactId });
      } else if (action.kind === 'push') {
        if ((await pushToRetell(action.person, action.value)) === 'sent') report.pushed++;
      } else {
        const e164 = e164Of(action.person.phones);
        if (!e164) continue;
        const check = resolveCheck(action.person, await getContactByPhone(e164), now);
        if (check.kind === 'push') {
          if ((await pushToRetell(action.person, true)) === 'sent') report.pushed++;
        } else if (check.kind === 'clear') {
          await updatePerson(action.person.id, check.write);
          report.cleared++;
        } else if (check.kind === 'contact-id') {
          await updatePerson(action.person.id, { retellContactId: check.contactId });
        }
      }
    } catch (error) {
      report.failed++;
      report.error ??= error instanceof Error ? error.message : String(error);
    }
  }

  return report;
};
