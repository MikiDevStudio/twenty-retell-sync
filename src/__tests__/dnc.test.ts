import { describe, expect, it } from 'vitest';

import {
  DNC_SOURCE,
  e164Of,
  flagChanged,
  flagFromCall,
  isAppWrite,
  newerContact,
  reconcile,
  resolveCheck,
  type DncPerson,
} from 'src/lib/dnc';

const NOW = 1_790_000_000_000;
const iso = (ms: number) => new Date(ms).toISOString();
const person = (over: Partial<DncPerson> = {}): DncPerson => ({ id: 'p1', retellDoNotCall: false, ...over });
const contact = (over = {}) => ({ contact_id: 'c1', phone_number: '+48500100200', user_modified_timestamp: NOW - 1000, ...over });

describe('flagFromCall', () => {
  const dncCall = { disconnection_reason: 'user_requested_dnc', start_timestamp: NOW - 60_000, end_timestamp: NOW };

  it('flags the person with the call end time and the call as source', () => {
    expect(flagFromCall(dncCall, person())).toEqual({
      retellDoNotCall: true,
      retellDoNotCallAt: iso(NOW),
      retellDoNotCallSource: DNC_SOURCE.call,
    });
  });

  it('ignores other calls, and calls older than the last change (a resync after an operator cleared it)', () => {
    expect(flagFromCall({ ...dncCall, disconnection_reason: 'user_hangup' }, person())).toBeNull();
    expect(flagFromCall(dncCall, person({ retellDoNotCallAt: iso(NOW + 1), retellDoNotCallSource: DNC_SOURCE.twenty }))).toBeNull();
  });

  it('upgrades a flag first seen on the contact to the call that caused it', () => {
    const fromContact = person({ retellDoNotCall: true, retellDoNotCallAt: iso(NOW - 5000), retellDoNotCallSource: DNC_SOURCE.contact });
    expect(flagFromCall(dncCall, fromContact)?.retellDoNotCallSource).toBe(DNC_SOURCE.call);
    expect(flagFromCall(dncCall, { ...fromContact, retellDoNotCallSource: DNC_SOURCE.call })).toBeNull();
  });
});

describe('helpers', () => {
  it('builds E.164 from Twenty phones and needs both parts', () => {
    expect(e164Of({ primaryPhoneNumber: '500 100 200', primaryPhoneCallingCode: '+48' })).toBe('+48500100200');
    expect(e164Of({ primaryPhoneNumber: '500100200' })).toBeNull();
  });

  it('tells app writes by the timestamp in the update', () => {
    expect(isAppWrite(['retellDoNotCall', 'retellDoNotCallAt', 'retellDoNotCallSource'])).toBe(true);
    expect(isAppWrite(['retellDoNotCall'])).toBe(false);
  });

  it('moves the last contact time only forward', () => {
    expect(newerContact(null, NOW)).toBe(iso(NOW));
    expect(newerContact(iso(NOW), NOW - 1)).toBeNull();
    expect(newerContact(iso(NOW), undefined)).toBeNull();
  });
});

describe('reconcile', () => {
  it('flags a person whose Retell contact is do-not-call, dated by the contact change', () => {
    expect(reconcile([{ contact: contact(), person: person() }], [], NOW)).toEqual([
      {
        kind: 'flag',
        personId: 'p1',
        contactId: 'c1',
        write: { retellDoNotCall: true, retellDoNotCallAt: iso(NOW - 1000), retellDoNotCallSource: DNC_SOURCE.contact },
      },
    ]);
  });

  it('only records the contact id when both sides already agree', () => {
    const flagged = person({ retellDoNotCall: true, retellDoNotCallSource: DNC_SOURCE.call });
    expect(reconcile([{ contact: contact(), person: flagged }], [flagged], NOW)).toEqual([
      { kind: 'contact-id', personId: 'p1', contactId: 'c1' },
    ]);
    expect(reconcile([{ contact: contact(), person: { ...flagged, retellContactId: 'c1' } }], [], NOW)).toEqual([]);
  });

  it('re-sends a clear made in Twenty after Retell set the flag', () => {
    const cleared = person({ retellDoNotCallSource: DNC_SOURCE.twenty, retellDoNotCallAt: iso(NOW - 10) });
    expect(reconcile([{ contact: contact(), person: cleared }], [cleared], NOW)).toEqual([{ kind: 'push', person: cleared, value: false }]);
  });

  it('lets Retell win when its change is newer than the clear in Twenty', () => {
    const cleared = person({ retellDoNotCallSource: DNC_SOURCE.twenty, retellDoNotCallAt: iso(NOW - 5000) });
    expect(reconcile([{ contact: contact(), person: cleared }], [cleared], NOW)[0].kind).toBe('flag');
  });

  it('looks up every flagged person missing from the list, and nobody else', () => {
    const flagged = person({ id: 'a', retellDoNotCall: true, retellDoNotCallSource: DNC_SOURCE.twenty });
    const clearedInTwenty = person({ id: 'c', retellDoNotCallSource: DNC_SOURCE.twenty });
    expect(reconcile([], [flagged, clearedInTwenty], NOW)).toEqual([{ kind: 'check', person: flagged }]);
  });
});

describe('resolveCheck', () => {
  const setInTwenty = person({ retellDoNotCall: true, retellDoNotCallSource: DNC_SOURCE.twenty, retellDoNotCallAt: iso(NOW - 5000) });
  const setByRetell = { ...setInTwenty, retellDoNotCallSource: DNC_SOURCE.call };

  it('re-sends a Twenty flag Retell never got', () => {
    expect(resolveCheck(setInTwenty, null, NOW)).toEqual({ kind: 'push' });
    expect(resolveCheck(setInTwenty, contact({ do_not_call: false, user_modified_timestamp: NOW - 9000 }), NOW)).toEqual({ kind: 'push' });
  });

  it('follows Retell when it cleared the flag later', () => {
    expect(resolveCheck(setInTwenty, contact({ do_not_call: false, user_modified_timestamp: NOW - 1000 }), NOW)).toEqual({
      kind: 'clear',
      write: { retellDoNotCall: false, retellDoNotCallAt: iso(NOW - 1000), retellDoNotCallSource: DNC_SOURCE.contact },
    });
  });

  it('keeps a Retell flag whose contact is gone, and fixes only the id when Retell agrees', () => {
    expect(resolveCheck(setByRetell, null, NOW)).toEqual({ kind: 'keep' });
    expect(resolveCheck(setByRetell, contact({ do_not_call: true }), NOW)).toEqual({ kind: 'contact-id', contactId: 'c1' });
  });

  it('treats an empty flag and false as the same value', () => {
    expect(flagChanged({ id: 'p', retellDoNotCall: null }, { id: 'p', retellDoNotCall: false })).toBe(false);
    expect(flagChanged({ id: 'p', retellDoNotCall: false }, { id: 'p', retellDoNotCall: true })).toBe(true);
  });
});
