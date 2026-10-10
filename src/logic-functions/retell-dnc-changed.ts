import { defineLogicFunction } from 'twenty-sdk/define';
import type { DatabaseEventPayload, ObjectRecordUpdateEvent } from 'twenty-sdk/logic-function';

import { DNC_CHANGED_FN_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { flagChanged, isAppWrite, type DncPerson } from 'src/lib/dnc';
import { applyTwentyChange } from 'src/lib/dnc-sync';

// Someone changed retellDoNotCall in Twenty (by hand, a workflow, another app): stamp the change and send it to Retell.
// The app's own writes carry retellDoNotCallAt and are skipped, so nothing echoes back.
const handler = async (event: DatabaseEventPayload<ObjectRecordUpdateEvent<DncPerson>>) => {
  if (isAppWrite(event.properties.updatedFields)) return { skipped: 'app write' };
  if (!flagChanged(event.properties.before, event.properties.after)) return { skipped: 'flag unchanged' };
  if (!process.env.RETELL_API_KEY) return { skipped: 'no RETELL_API_KEY' };

  const person = { ...event.properties.after, id: event.recordId };
  return { result: await applyTwentyChange(person, Boolean(person.retellDoNotCall)) };
};

export default defineLogicFunction({
  universalIdentifier: DNC_CHANGED_FN_UNIVERSAL_IDENTIFIER,
  name: 'retell-dnc-changed',
  description: 'Sends a do-not-call change made in Twenty to the Retell contact',
  timeoutSeconds: 30,
  handler,
  databaseEventTriggerSettings: { eventName: 'person.updated', updatedFields: ['retellDoNotCall'] },
});
