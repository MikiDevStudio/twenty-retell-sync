import { randomUUID } from 'node:crypto';

// Retell transcript -> Twenty RICH_TEXT value ({ markdown, blocknote }).
// One paragraph per turn with a bold speaker label; markdown is for search and AI readers,
// blocknote is what the record page renders. A recording link becomes an audio player on top.

type Json = Record<string, any>;

export type RichText = { markdown: string; blocknote: string };

type Turn = { speaker: string; text: string };

const LABELS: Record<string, string> = { agent: 'Agent', user: 'Customer', transfer_target: 'Transfer' };

const labelOf = (role: unknown): string => LABELS[String(role)] ?? 'Other';

// Calls carry transcript_object, chats carry message_with_tool_calls (tool calls mixed in, other roles).
// With "Everything except PII" only the scrubbed copy exists: scrubbed_transcript_with_tool_calls (calls).
const turnsFromItems = (items: unknown): Turn[] =>
  (Array.isArray(items) ? items : [])
    .filter((item: Json) => item?.role in LABELS && typeof item.content === 'string' && item.content.trim())
    .map((item: Json) => ({ speaker: labelOf(item.role), text: item.content.trim() }));

// Last resort when only the flat "Agent: ...\nUser: ..." string is present.
const turnsFromString = (transcript: unknown): Turn[] =>
  typeof transcript !== 'string'
    ? []
    : transcript
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const match = line.match(/^(Agent|User):\s*(.*)$/);
          return match ? { speaker: match[1] === 'User' ? 'Customer' : 'Agent', text: match[2] } : { speaker: '', text: line };
        });

export const turnsOf = (record: Json): Turn[] => {
  const fromItems = turnsFromItems(
    record.scrubbed_transcript_with_tool_calls ??
      record.scrubbed_message_with_tool_calls ??
      record.transcript_object ??
      record.message_with_tool_calls ??
      record.transcript_with_tool_calls,
  );
  return fromItems.length > 0 ? fromItems : turnsFromString(record.transcript);
};

const paragraph = ({ speaker, text }: Turn) => ({
  id: randomUUID(),
  type: 'paragraph',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
  content: [
    ...(speaker ? [{ type: 'text', text: `${speaker}: `, styles: { bold: true } }] : []),
    { type: 'text', text, styles: {} },
  ],
  children: [],
});

const audio = (url: string) => ({
  id: randomUUID(),
  type: 'audio',
  props: { backgroundColor: 'default', name: 'Recording', url, caption: '', showPreview: true },
  children: [],
});

export const buildTranscript = (record: Json, recordingUrl?: string | null): RichText | null => {
  const turns = turnsOf(record);
  if (turns.length === 0) return null;

  return {
    markdown: turns.map((turn) => (turn.speaker ? `**${turn.speaker}:** ${turn.text}` : turn.text)).join('\n\n'),
    blocknote: JSON.stringify([...(recordingUrl ? [audio(recordingUrl)] : []), ...turns.map(paragraph)]),
  };
};
