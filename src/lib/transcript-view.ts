// Reads back the markdown that `buildTranscript` stores: one `**Label:** text` paragraph per turn.
// Kept apart from transcript.ts because the front component cannot import node modules.

export type ViewTurn = { label: string | null; text: string };

export const parseTurns = (markdown: string): ViewTurn[] =>
  markdown
    .split(/\n{2,}/)
    .filter((part) => part.trim())
    .map((part) => {
      const match = part.match(/^\*\*(.+?):\*\*\s*([\s\S]*)$/);
      return match ? { label: match[1], text: match[2] } : { label: null, text: part };
    });
