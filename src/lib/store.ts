import { CoreApiClient } from 'twenty-client-sdk/core';

import { DNC_SOURCE, type DncPerson } from 'src/lib/dnc';
import type { CallPerson } from 'src/lib/outbound';
import { nationalCandidates, phoneMatches, splitE164, type PersonPhones } from 'src/lib/phone';

type Json = Record<string, unknown>;

export type Kind = {
  plural: string;
  create: string;
  update: string;
  remove: string;
  idField: 'callId' | 'chatId';
};

export const CALL_KIND: Kind = {
  plural: 'retellCalls',
  create: 'createRetellCall',
  update: 'updateRetellCall',
  remove: 'deleteRetellCall',
  idField: 'callId',
};

export const CHAT_KIND: Kind = {
  plural: 'retellChats',
  create: 'createRetellChat',
  update: 'updateRetellChat',
  remove: 'deleteRetellChat',
  idField: 'chatId',
};

export type Existing = { id: string; summary: string | null; endedAt: string | null; opportunityId: string | null };
export type UpsertResult = 'created' | 'updated';
export type Saved = { result: UpsertResult; personId: string | null };

// The generated client is typed per object; these helpers address objects by name, so they use
// the untyped surface of the same client.
const client = (): any => new CoreApiClient();

const NODE = { id: true, summary: true, endedAt: true, opportunityId: true, createdAt: true } as const;

const findAll = async (kind: Kind, externalId: string): Promise<(Existing & { createdAt: string })[]> => {
  const result = await client().query({
    [kind.plural]: {
      __args: { filter: { [kind.idField]: { eq: externalId } }, orderBy: [{ createdAt: 'AscNullsFirst' }], first: 10 },
      edges: { node: NODE },
    },
  });
  return result[kind.plural].edges.map((edge: { node: Existing & { createdAt: string } }) => edge.node);
};

export const findExisting = async (kind: Kind, externalId: string): Promise<Existing | null> =>
  (await findAll(kind, externalId))[0] ?? null;

export const findPersonId = async (e164: string | null): Promise<string | null> => {
  if (!e164) return null;
  const candidates = nationalCandidates(e164);
  if (candidates.length === 0) return null;

  const result = await client().query({
    people: {
      __args: { filter: { phones: { primaryPhoneNumber: { in: candidates } } }, first: 50 },
      edges: { node: { id: true, phones: { primaryPhoneNumber: true, primaryPhoneCallingCode: true } } },
    },
  });

  const match = result.people.edges.find((edge: { node: { phones: PersonPhones } }) =>
    phoneMatches(e164, edge.node.phones),
  );
  return match?.node.id ?? null;
};

export type NewPerson = { firstName: string; lastName: string };

const personNode = { id: true, createdAt: true, phones: { primaryPhoneNumber: true, primaryPhoneCallingCode: true } } as const;

// An unknown number becomes a Person. Two events for one new caller can both find nobody and both create;
// the oldest Person wins and the younger one removes itself, so both events end up on the same record.
export const createPersonFor = async (e164: string, name: NewPerson): Promise<string | null> => {
  const split = splitE164(e164);
  if (!split) return null;

  const created = await client().mutation({
    createPerson: {
      __args: { data: { name, phones: { primaryPhoneNumber: split.national, primaryPhoneCallingCode: split.callingCode } } },
      id: true,
    },
  });
  const mine: string = created.createPerson.id;

  const result = await client().query({
    people: {
      __args: {
        filter: { phones: { primaryPhoneNumber: { eq: split.national } } },
        orderBy: [{ createdAt: 'AscNullsFirst' }],
        first: 10,
      },
      edges: { node: personNode },
    },
  });
  const oldest = result.people.edges
    .map((edge: { node: { id: string; phones: PersonPhones } }) => edge.node)
    .find((node: { phones: PersonPhones }) => phoneMatches(e164, node.phones));

  if (oldest && oldest.id !== mine) {
    await client().mutation({ deletePerson: { __args: { id: mine }, id: true } }).catch(() => undefined);
    return oldest.id;
  }
  return mine;
};

// Retell never un-sets a value, so an older event (a retried call_ended arriving after
// call_analyzed) must not blank fields that are already filled in.
const withoutNulls = (data: Json): Json =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== null && value !== undefined));

const update = async (kind: Kind, id: string, data: Json): Promise<void> => {
  await client().mutation({ [kind.update]: { __args: { id, data: withoutNulls(data) }, id: true } });
};

// Two events for one call can arrive together and both find nothing, so both create. The oldest
// record wins and the extra ones are removed. An event whose own record lost must still hand its
// data to the survivor, otherwise a late call_analyzed could vanish with the record it created.
const settleCreate = async (kind: Kind, externalId: string, createdId: string, data: Json): Promise<void> => {
  const [survivor, ...extras] = await findAll(kind, externalId);
  if (!survivor) return;

  for (const extra of extras) {
    // The other racing event may delete the same extra first; that is fine.
    await client().mutation({ [kind.remove]: { __args: { id: extra.id }, id: true } }).catch(() => undefined);
  }
  if (survivor.id !== createdId) await update(kind, survivor.id, data);
};

export type Link = { phone: string | null; newPerson?: NewPerson; opportunityId?: string | null; linkLatestOpportunity?: boolean };

// An opportunity that does not exist (a typo, a deleted record) must not fail the save: the call is stored unlinked.
export const findOpportunity = async (id: string): Promise<{ id: string; pointOfContactId: string | null } | null> => {
  const result = await client()
    .query({
      opportunities: { __args: { filter: { id: { eq: id } }, first: 1 }, edges: { node: { id: true, pointOfContactId: true } } },
    })
    .catch(() => null);
  return result?.opportunities?.edges?.[0]?.node ?? null;
};

// The newest opportunity whose contact is this Person: the deal being worked on is usually the latest one.
// Twenty filters a relation through its generated `<name>Id` column, not `{ id: { eq } }`.
export const findLatestOpportunityId = async (personId: string): Promise<string | null> => {
  const result = await client()
    .query({
      opportunities: {
        __args: { filter: { pointOfContactId: { eq: personId } }, orderBy: [{ createdAt: 'DescNullsLast' }], first: 1 },
        edges: { node: { id: true } },
      },
    })
    .catch(() => null);
  return result?.opportunities?.edges?.[0]?.node?.id ?? null;
};

export const upsert = async (kind: Kind, externalId: string, data: Json, link: Link): Promise<Saved> => {
  // Person: the number first, then the opportunity's contact, then a new one from the number.
  const opportunity = link.opportunityId ? await findOpportunity(link.opportunityId) : null;
  const personId =
    (await findPersonId(link.phone)) ??
    opportunity?.pointOfContactId ??
    (link.phone && link.newPerson ? await createPersonFor(link.phone, link.newPerson) : null);

  const existing = await findExisting(kind, externalId);

  // An explicit id always wins. The newest-opportunity rule only fills an empty link, so it never overrides
  // what a person chose by hand and never moves a call to a deal opened after it.
  const opportunityId =
    opportunity?.id ??
    (link.linkLatestOpportunity && personId && !existing?.opportunityId ? await findLatestOpportunityId(personId) : null);

  const payload = {
    ...data,
    ...(personId ? { personId } : {}),
    ...(opportunityId ? { opportunityId } : {}),
  };
  if (existing) {
    await update(kind, existing.id, payload);
    return { result: 'updated', personId };
  }

  // Twenty rejects a null rich-text value on create ("Cannot read properties of null"); an absent key is the same as null.
  const created = await client().mutation({ [kind.create]: { __args: { data: withoutNulls(payload) }, id: true } });
  await settleCreate(kind, externalId, created[kind.create].id, payload);
  return { result: 'created', personId };
};

// Person fields the app owns: the do-not-call mirror and the last contact time.
const DNC_NODE = {
  id: true,
  phones: { primaryPhoneNumber: true, primaryPhoneCallingCode: true },
  retellDoNotCall: true,
  retellDoNotCallAt: true,
  retellDoNotCallSource: true,
  retellContactId: true,
  retellLastContactedAt: true,
} as const;

export type AppPerson = DncPerson & { retellLastContactedAt?: string | null };

export const getPerson = async (id: string): Promise<AppPerson | null> => {
  const result = await client().query({
    people: { __args: { filter: { id: { eq: id } }, first: 1 }, edges: { node: DNC_NODE } },
  });
  return result.people.edges[0]?.node ?? null;
};

// Everyone the do-not-call reconcile has to look at: flagged, or last changed in Twenty (a clear that may not have reached Retell).
// What an outbound call needs to know about the person: the do-not-call flag, the number and the agent's variables.
export const getPersonForCall = async (id: string): Promise<CallPerson | null> => {
  const result = await client().query({
    people: {
      __args: { filter: { id: { eq: id } }, first: 1 },
      edges: {
        node: {
          ...DNC_NODE,
          name: { firstName: true, lastName: true },
          emails: { primaryEmail: true },
          company: { name: true },
        },
      },
    },
  });
  return result.people.edges[0]?.node ?? null;
};

export const findTrackedDncPeople = async (): Promise<AppPerson[]> => {
  const people: AppPerson[] = [];
  let after: string | undefined;
  do {
    const result = await client().query({
      people: {
        __args: {
          filter: { or: [{ retellDoNotCall: { eq: true } }, { retellDoNotCallSource: { eq: DNC_SOURCE.twenty } }] },
          first: 200,
          ...(after ? { after } : {}),
        },
        edges: { node: DNC_NODE },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    });
    people.push(...result.people.edges.map((edge: { node: AppPerson }) => edge.node));
    after = result.people.pageInfo.hasNextPage ? result.people.pageInfo.endCursor : undefined;
  } while (after);
  return people;
};

export const updatePerson = async (id: string, data: Json): Promise<void> => {
  await client().mutation({ updatePerson: { __args: { id, data }, id: true } });
};
