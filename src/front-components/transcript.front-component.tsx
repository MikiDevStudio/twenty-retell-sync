import { defineFrontComponent } from 'twenty-sdk/define';

import { TranscriptView } from 'src/components/transcript-view';
import { TRANSCRIPT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

// Keep this file free of JSX: the SDK finds entities by parsing every file as plain TypeScript, and a
// large JSX body makes that parse swallow the default export, so the component silently disappears.
export default defineFrontComponent({
  universalIdentifier: TRANSCRIPT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'retell-transcript',
  description: 'Summary, recording player and readable transcript for a Retell call or chat',
  component: TranscriptView,
});
