import { defineApplication } from 'twenty-sdk/define';

import {
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  APPLICATION_UNIVERSAL_IDENTIFIER,
  VAR_BACKFILL_DAYS_UNIVERSAL_IDENTIFIER,
  VAR_CREATE_PEOPLE_UNIVERSAL_IDENTIFIER,
  VAR_LINK_LATEST_OPPORTUNITY_UNIVERSAL_IDENTIFIER,
  VAR_EXCLUDE_FIELDS_UNIVERSAL_IDENTIFIER,
  VAR_RETELL_API_KEY_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  // Marketplace listing. The About tab is README.md; the gallery images are rendered from design/gallery.
  author: 'MikiDev Studio',
  category: 'Communication',
  websiteUrl: 'https://github.com/MikiDevStudio/twenty-retell-sync',
  issueReportUrl: 'https://github.com/MikiDevStudio/twenty-retell-sync/issues',
  logo: 'public/logo.png',
  galleryImages: [
    'public/gallery/01-cover.png',
    'public/gallery/02-how-it-works.png',
    'public/gallery/03-summary-tab.png',
    'public/gallery/04-setup.png',
    'public/gallery/05-call-and-text.png',
  ],
  applicationVariables: {
    RETELL_API_KEY: {
      universalIdentifier: VAR_RETELL_API_KEY_UNIVERSAL_IDENTIFIER,
      label: 'Retell API key',
      description:
        'Retell API key with the webhook badge (Retell dashboard, API keys). It both calls the Retell API and verifies webhook signatures.',
      isSecret: true,
      isRequired: true,
    },
    SYNC_BACKFILL_DAYS: {
      universalIdentifier: VAR_BACKFILL_DAYS_UNIVERSAL_IDENTIFIER,
      label: 'Backfill days',
      description: 'How far back the first sync reaches. Later syncs continue from the last synced call.',
      value: '30',
      isSecret: false,
    },
    CREATE_PEOPLE: {
      universalIdentifier: VAR_CREATE_PEOPLE_UNIVERSAL_IDENTIFIER,
      label: 'Create people',
      description:
        'true: a call or chat from a number that matches no Person creates one. false: such records stay unlinked.',
      value: 'true',
      isSecret: false,
    },
    LINK_LATEST_OPPORTUNITY: {
      universalIdentifier: VAR_LINK_LATEST_OPPORTUNITY_UNIVERSAL_IDENTIFIER,
      label: 'Link to latest opportunity',
      description:
        'true: a new call or chat with no opportunity_id is linked to the newest opportunity whose contact is its Person. false: only an explicit opportunity_id links.',
      value: 'true',
      isSecret: false,
    },
    SYNC_EXCLUDE_FIELDS: {
      universalIdentifier: VAR_EXCLUDE_FIELDS_UNIVERSAL_IDENTIFIER,
      label: 'Fields not to store',
      description:
        'Comma-separated field names left empty in Twenty, for example "transcript,dynamicVariables". Applies to calls and chats.',
      value: '',
      isSecret: false,
    },
  },
});
