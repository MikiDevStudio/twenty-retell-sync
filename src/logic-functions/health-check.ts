import { defineHealthCheck } from 'twenty-sdk/define';

import { HEALTH_CHECK_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { ping, RetellApiError } from 'src/lib/retell-api';

export default defineHealthCheck({
  universalIdentifier: HEALTH_CHECK_UNIVERSAL_IDENTIFIER,
  name: 'health-check',
  handler: async () => {
    try {
      await ping();
      return { status: 'OK' };
    } catch (error) {
      if (error instanceof RetellApiError && (error.status === 401 || error.status === 403)) {
        return {
          status: 'ERROR',
          title: 'Retell rejected the API key',
          description: 'Set a valid Retell API key (with the webhook badge) in the app settings.',
        };
      }
      // Network trouble or a Retell outage is not a configuration problem: stay silent.
      return { status: 'OK' };
    }
  },
});
