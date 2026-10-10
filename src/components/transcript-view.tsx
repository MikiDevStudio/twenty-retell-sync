import { useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { useColorScheme, useSelectedObjectMetadata, useSelectedRecordIds } from 'twenty-sdk/front-component';

import { parseTurns, type ViewTurn } from 'src/lib/transcript-view';

// The Summary tab of a call or chat: the summary first (what operators read most), then the
// recording player and the full transcript for analysis.
export const TranscriptView = () => {
  const dark = useColorScheme() === 'dark';
  const ink = dark ? '#ebebeb' : '#333333';
  const muted = dark ? '#999999' : '#818181';
  const line = dark ? '#3a3a3a' : '#ebebeb';

  const object = useSelectedObjectMetadata();
  const [recordId] = useSelectedRecordIds();
  const plural = object?.namePlural;

  const [summary, setSummary] = useState<string | null>(null);
  const [turns, setTurns] = useState<ViewTurn[] | null>(null);
  const [recording, setRecording] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recordId || !plural) return;
    let cancelled = false;
    (async () => {
      try {
        const node: Record<string, unknown> = { id: true, summary: true, transcript: { markdown: true } };
        if (plural === 'retellCalls') node.recording = { primaryLinkUrl: true };
        const result: any = await new CoreApiClient().query({
          [plural]: { __args: { filter: { id: { eq: recordId } } }, edges: { node } },
        } as any);
        if (cancelled) return;
        const row = result?.[plural]?.edges?.[0]?.node;
        setSummary(row?.summary || null);
        setTurns(row?.transcript?.markdown ? parseTurns(row.transcript.markdown) : []);
        setRecording(row?.recording?.primaryLinkUrl ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recordId, plural]);

  const box = { padding: 16, color: ink, font: 'inherit' } as const;
  const heading = {
    margin: '0 0 8px',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: muted,
  } as const;
  if (error) return <div style={{ ...box, color: muted }}>Could not load the summary: {error}</div>;
  if (!turns) return <div style={{ ...box, color: muted }}>Loading...</div>;

  return (
    <div style={box}>
      <h3 style={heading}>Summary</h3>
      <div style={{ marginBottom: 24, whiteSpace: 'pre-wrap', color: summary ? ink : muted }}>
        {summary ?? 'No summary.'}
      </div>
      <h3 style={heading}>Transcript</h3>
      {recording && <audio controls src={recording} style={{ width: '100%', margin: '4px 0 16px' }} />}
      {turns.length === 0 && <div style={{ color: muted }}>No transcript.</div>}
      {turns.map((turn, index) => (
        <div key={index} style={{ padding: '8px 0', borderBottom: `1px solid ${line}`, whiteSpace: 'pre-wrap' }}>
          {turn.label && <strong>{turn.label}: </strong>}
          {turn.text}
        </div>
      ))}
    </div>
  );
};
