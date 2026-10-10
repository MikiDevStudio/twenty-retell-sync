import { digitsOf, type PersonPhones } from 'src/lib/phone';

// Do-not-call: Retell keeps one flag per contact (a phone number) that covers calls and SMS. The app mirrors it
// on Person as retellDoNotCall, with the time and origin of the last change. Pure decisions live here; the reads
// and writes are in store.ts, retell-api.ts and dnc-sync.ts.

export const DNC_SOURCE = {
  call: 'RETELL_CALL', // the caller asked on a call (disconnection_reason user_requested_dnc)
  contact: 'RETELL_CONTACT', // the contact changed in Retell: SMS opt-out, carrier opt-out or the dashboard
  twenty: 'TWENTY', // set in Twenty: by hand, a workflow or another app
} as const;

export type DncSource = (typeof DNC_SOURCE)[keyof typeof DNC_SOURCE];

export const DNC_REASON = 'user_requested_dnc';

export type DncPerson = {
  id: string;
  phones?: PersonPhones | null;
  retellDoNotCall?: boolean | null;
  retellDoNotCallAt?: string | null;
  retellDoNotCallSource?: string | null;
  retellContactId?: string | null;
};

export type DncContact = { contact_id: string; phone_number: string; do_not_call?: boolean; user_modified_timestamp?: number };

export type DncWrite = { retellDoNotCall: boolean; retellDoNotCallAt: string; retellDoNotCallSource: DncSource };

const ms = (iso: string | null | undefined): number => (iso ? Date.parse(iso) || 0 : 0);

export const dncWrite = (value: boolean, atMs: number, source: DncSource): DncWrite => ({
  retellDoNotCall: value,
  retellDoNotCallAt: new Date(atMs).toISOString(),
  retellDoNotCallSource: source,
});

// Twenty keeps the calling code apart from the national number; Retell wants E.164.
export const e164Of = (phones: PersonPhones | null | undefined): string | null => {
  const calling = digitsOf(phones?.primaryPhoneCallingCode);
  const national = digitsOf(phones?.primaryPhoneNumber);
  return calling && national ? `+${calling}${national}` : null;
};

// Every write the app makes carries the timestamp. A change of the flag without one came from someone else
// (a person, a workflow, another app), so the app stamps it and passes it on to Retell.
export const isAppWrite = (updatedFields: readonly string[] | undefined): boolean =>
  (updatedFields ?? []).includes('retellDoNotCallAt');

// A call that ended with a do-not-call request flags its Person, unless the flag changed after the call
// (an operator cleared it later, and a resync replays the old call).
export const flagFromCall = (call: Record<string, any>, person: DncPerson): DncWrite | null => {
  if (call.disconnection_reason !== DNC_REASON) return null;
  const endedMs = call.end_timestamp ?? call.start_timestamp ?? Date.now();
  if (ms(person.retellDoNotCallAt) >= endedMs) return null;
  if (person.retellDoNotCall && person.retellDoNotCallSource === DNC_SOURCE.call) return null;
  return dncWrite(true, endedMs, DNC_SOURCE.call);
};

// The newest contact time wins, so a late or replayed event never moves it back.
export const newerContact = (current: string | null | undefined, startedMs: number | undefined): string | null =>
  typeof startedMs === 'number' && startedMs > ms(current) ? new Date(startedMs).toISOString() : null;

export type Reconcile =
  | { kind: 'flag'; personId: string; write: DncWrite; contactId: string }
  | { kind: 'push'; person: DncPerson; value: boolean }
  | { kind: 'check'; person: DncPerson }
  | { kind: 'contact-id'; personId: string; contactId: string };

// One pass over both sides. `matched` pairs each flagged Retell contact with the Person its number belongs to;
// `tracked` holds every Person that is flagged in Twenty or was last changed in Twenty.
export const reconcile = (
  matched: { contact: DncContact; person: DncPerson }[],
  tracked: DncPerson[],
  now: number,
): Reconcile[] => {
  const actions: Reconcile[] = [];
  const seen = new Set<string>();

  for (const { contact, person } of matched) {
    seen.add(person.id);
    const changedInRetell = contact.user_modified_timestamp ?? now;

    if (person.retellDoNotCall) {
      if (person.retellContactId !== contact.contact_id) {
        actions.push({ kind: 'contact-id', personId: person.id, contactId: contact.contact_id });
      }
    } else if (person.retellDoNotCallSource === DNC_SOURCE.twenty && ms(person.retellDoNotCallAt) > changedInRetell) {
      // Cleared in Twenty after Retell set it, and the earlier push did not land.
      actions.push({ kind: 'push', person, value: false });
    } else {
      actions.push({ kind: 'flag', personId: person.id, write: dncWrite(true, changedInRetell, DNC_SOURCE.contact), contactId: contact.contact_id });
    }
  }

  // Flagged in Twenty but missing from Retell's do-not-call list. The list can lag behind a change, so each one
  // is looked up on its own before anything is written (see resolveCheck).
  for (const person of tracked) {
    if (!seen.has(person.id) && person.retellDoNotCall) actions.push({ kind: 'check', person });
  }

  return actions;
};

export type CheckResult =
  | { kind: 'push' } // Retell is missing the flag set in Twenty: send it again
  | { kind: 'clear'; write: DncWrite } // Retell cleared it after it was set: follow Retell
  | { kind: 'contact-id'; contactId: string }
  | { kind: 'keep' };

// A flagged Person and the Retell contact for their number, looked up directly. The newer change wins. A contact
// that is gone keeps a flag Retell set: clearing a do-not-call by mistake is the worse error.
export const resolveCheck = (person: DncPerson, contact: DncContact | null, now: number): CheckResult => {
  const fromTwenty = !person.retellDoNotCallSource || person.retellDoNotCallSource === DNC_SOURCE.twenty;
  if (!contact) return fromTwenty ? { kind: 'push' } : { kind: 'keep' };
  if (contact.do_not_call) {
    return person.retellContactId === contact.contact_id ? { kind: 'keep' } : { kind: 'contact-id', contactId: contact.contact_id };
  }
  const changedInRetell = contact.user_modified_timestamp ?? 0;
  if (changedInRetell > ms(person.retellDoNotCallAt)) {
    return { kind: 'clear', write: dncWrite(false, changedInRetell || now, DNC_SOURCE.contact) };
  }
  return fromTwenty ? { kind: 'push' } : { kind: 'keep' };
};

// The update trigger can fire on a save that did not change the flag (an old row going from empty to false
// counts as a change for Twenty), so the handler compares the values itself.
export const flagChanged = (before: DncPerson | undefined, after: DncPerson | undefined): boolean =>
  Boolean(before?.retellDoNotCall) !== Boolean(after?.retellDoNotCall);
