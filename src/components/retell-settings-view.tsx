import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { copyToClipboard, enqueueSnackbar, useColorScheme } from 'twenty-sdk/front-component';

import { APPLICATION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

type Agent = { id: string; name: string; channel: string; hasWebhook: boolean; webhookUrl: string | null };

type Status = {
  connected: boolean;
  keyIsSet: boolean;
  keyMask: string | null;
  error?: string;
  settings: { intervalMinutes: number; publicUrl: string; agentIds: string[]; outboundFromNumber: string; outboundAgentId: string; smsFromNumber: string; smsAgentId: string };
  webhookUrl: string;
  webhookUrlIsPublic: boolean;
  resync: ResyncJob | null;
  lastSync: { at: number; trigger: string; ok: boolean; calls?: Counts; chats?: Counts; error?: string } | null;
  lastWebhookAt: number | null;
  lastRejectedAt: number | null;
  lastRejectedReason: string | null;
  nextRunAt: number | null;
  agents: Agent[];
  phoneNumbers: PhoneNumber[];
};

type PhoneNumber = { number: string; nickname: string | null; hasOutboundAgent: boolean; hasSmsAgent: boolean };

type ResyncTotals = { created: number; updated: number; failed: number; done: boolean; error?: string };
type ResyncJob = { startedAt: number; days: number; done: boolean; finishedAt?: number; calls: ResyncTotals; chats: ResyncTotals };

type Counts = { created?: number; updated?: number; skipped?: number; failed?: number; error?: string };

const api = new RestApiClient();

// Non-secret application variables the generated Variables page used to show; this tab replaces that page.
const OPTION_KEYS = ['SYNC_BACKFILL_DAYS', 'SYNC_EXCLUDE_FIELDS', 'CREATE_PEOPLE', 'LINK_LATEST_OPPORTUNITY'] as const;

const readOptions = async (): Promise<Record<string, string>> => {
  const result: any = await new MetadataApiClient().query({
    findOneApplication: {
      __args: { universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER },
      applicationVariables: { key: true, value: true },
    },
  } as any);
  const rows: { key: string; value: string }[] = result?.findOneApplication?.applicationVariables ?? [];
  return Object.fromEntries(rows.filter((row) => (OPTION_KEYS as readonly string[]).includes(row.key)).map((row) => [row.key, row.value ?? '']));
};

const message = (error: unknown): string => {
  const body = (error as { body?: unknown })?.body;
  if (typeof body === 'string' && body) return body;
  return error instanceof Error ? error.message : String(error);
};

const when = (ms: number | null | undefined): string => (ms ? new Date(ms).toLocaleString() : 'never');

const counts = (c?: Counts): string =>
  c ? `${c.created ?? 0} new, ${c.updated ?? 0} updated, ${c.skipped ?? 0} unchanged${c.failed ? `, ${c.failed} failed${c.error ? ` (${c.error})` : ''}` : ''}` : '-';

const resyncCounts = (t: ResyncTotals): string => {
  if (t.created + t.updated + t.failed === 0) return t.done ? 'none found' : 'none yet';
  return `${t.created} new, ${t.updated} updated${t.failed ? `, ${t.failed} failed${t.error ? ` (${t.error})` : ''}` : ''}`;
};

export const RetellSettings = () => {
  const dark = useColorScheme() === 'dark';
  const ink = dark ? '#ebebeb' : '#333333';
  const muted = dark ? '#999999' : '#818181';
  const line = dark ? '#3a3a3a' : '#ebebeb';

  const card: CSSProperties = { border: `1px solid ${line}`, borderRadius: 8, padding: 16, marginBottom: 16, color: ink };
  const input: CSSProperties = {
    border: `1px solid ${line}`, borderRadius: 4, padding: '6px 8px', background: 'transparent', color: ink, font: 'inherit',
  };
  const button = (primary = false): CSSProperties => ({
    border: `1px solid ${line}`, borderRadius: 4, padding: '6px 12px', cursor: 'pointer', font: 'inherit',
    background: primary ? (dark ? '#ebebeb' : '#333333') : 'transparent', color: primary ? (dark ? '#141414' : '#ffffff') : ink,
  });

  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [options, setOptions] = useState<Record<string, string> | null>(null);
  const [interval, setIntervalValue] = useState('10');
  const [publicUrl, setPublicUrl] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [resyncDays, setResyncDays] = useState('30');
  const [fromNumber, setFromNumber] = useState('');
  const [outboundAgent, setOutboundAgent] = useState('');
  const [smsNumber, setSmsNumber] = useState('');
  const [smsAgent, setSmsAgent] = useState('');

  const load = useCallback(async (resetForm: boolean) => {
    try {
      const next = await api.get<Status>('/s/retell/status');
      setStatus(next);
      setLoadError(null);
      if (resetForm) {
        setIntervalValue(String(next.settings.intervalMinutes));
        setPublicUrl(next.settings.publicUrl);
        setSelected(next.settings.agentIds);
        setFromNumber(next.settings.outboundFromNumber);
        setOutboundAgent(next.settings.outboundAgentId);
        setSmsNumber(next.settings.smsFromNumber);
        setSmsAgent(next.settings.smsAgentId);
      }
    } catch (e) {
      setLoadError(message(e));
    }
  }, []);

  useEffect(() => {
    void load(true);
    readOptions().then(setOptions).catch(() => setOptions(null));
  }, [load]);

  // A resync runs in chunks on the server's cron tick; keep the numbers fresh until it finishes.
  const resyncRunning = status?.resync ? !status.resync.done : false;
  useEffect(() => {
    if (!resyncRunning) return;
    const timer = setInterval(() => void load(false), 15000);
    return () => clearInterval(timer);
  }, [resyncRunning, load]);

  const run = async (name: string, action: () => Promise<string | void>) => {
    setBusy(name);
    try {
      const done = await action();
      if (done) await enqueueSnackbar({ message: done, variant: 'success' });
    } catch (e) {
      await enqueueSnackbar({ message: message(e), variant: 'error' });
    } finally {
      setBusy(null);
      await load(false);
    }
  };

  // Secret variables never reach this component, but writing one is allowed (needs the APPLICATIONS permission).
  const saveKey = () =>
    run('key', async () => {
      await new MetadataApiClient().mutation({
        updateOneApplicationVariable: { __args: { key: 'RETELL_API_KEY', value: apiKey.trim() } },
      } as any);
      setApiKey('');
      return 'Retell API key saved';
    });

  const saveOptions = () =>
    run('options', async () => {
      for (const key of OPTION_KEYS) {
        await new MetadataApiClient().mutation({
          updateOneApplicationVariable: { __args: { key, value: (options?.[key] ?? '').trim() } },
        } as any);
      }
      return 'Options saved';
    });

  const save = async () => {
    await api.post('/s/retell/settings', {
      intervalMinutes: Number(interval),
      publicUrl,
      agentIds: selected,
      outboundFromNumber: fromNumber,
      outboundAgentId: outboundAgent,
      smsFromNumber: smsNumber,
      smsAgentId: smsAgent,
    });
  };

  const connect = (remove: boolean) =>
    run(remove ? 'disconnect' : 'connect', async () => {
      await save();
      const res = await api.post<{ results: { ok: boolean }[] }>('/s/retell/connect', { remove, agentIds: selected });
      const ok = res.results.filter((r) => r.ok).length;
      const failed = res.results.length - ok;
      if (failed) throw new Error(`${ok} agents updated, ${failed} failed`);
      return remove ? `Webhook removed from ${ok} agents` : `Webhook set on ${ok} agents`;
    });

  const row = (label: string, value: ReactNode) => (
    <div style={{ display: 'flex', gap: 12, padding: '4px 0' }}>
      <div style={{ width: 180, color: muted }}>{label}</div>
      <div style={{ flex: 1, wordBreak: 'break-all' }}>{value}</div>
    </div>
  );

  if (loadError) return <div style={{ ...card, color: '#d9534f' }}>Could not load status: {loadError}</div>;
  if (!status) return <div style={{ color: muted }}>Loading...</div>;

  const last = status.lastSync;

  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      <div style={card}>
        <h3 style={{ margin: '0 0 8px' }}>Retell API key</h3>
        <div style={{ color: muted, marginBottom: 8 }}>Use the key with the Webhook badge (Retell: Settings, API Keys). Retell signs webhooks with that key only; with any other key they fail with 401.</div>
        <div style={{ marginBottom: 8, fontFamily: 'monospace', color: !status.keyIsSet || !status.connected ? '#d9534f' : '#3fa66b' }}>
          {!status.keyIsSet ? 'No key saved' : status.connected ? `✓ ${status.keyMask}` : `${status.keyMask}: ${status.error ?? 'rejected by Retell'}`}
        </div>
        <input
          type="password"
          autoComplete="off"
          placeholder="key_..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{ ...input, width: 360, marginRight: 8 }}
        />
        <button style={button(true)} disabled={!apiKey.trim() || busy !== null} onClick={() => void saveKey()}>
          {busy === 'key' ? 'Saving...' : 'Save key'}
        </button>
      </div>

      <div style={card}>
        <h3 style={{ margin: '0 0 8px' }}>Retell connection</h3>
        {row('Status', status.connected ? 'Connected' : <span style={{ color: '#d9534f' }}>{status.error ?? 'Not connected'}</span>)}
        {row('Last webhook received', when(status.lastWebhookAt))}
        {status.lastRejectedAt && status.lastRejectedAt > (status.lastWebhookAt ?? 0) && row(
          'Webhook rejected',
          <span style={{ color: '#d9534f' }}>
            {when(status.lastRejectedAt)}: signature check failed ({status.lastRejectedReason ?? 'reason unknown'}). Save the API key that has the webhook badge in the Retell dashboard.
          </span>,
        )}
        {row('Last sync', last ? `${when(last.at)} (${last.trigger}) ${last.ok ? '' : '- failed: ' + last.error}` : 'never')}
        {last?.ok && row('Calls', counts(last.calls))}
        {last?.ok && row('Chats', counts(last.chats))}
        {row('Next scheduled sync', when(status.nextRunAt))}
        <div style={{ marginTop: 12 }}>
          <button
            style={button(true)}
            disabled={busy !== null}
            onClick={() => run('sync', async () => { await api.post('/s/retell/sync'); return 'Sync finished'; })}
          >
            {busy === 'sync' ? 'Syncing...' : 'Sync now'}
          </button>
        </div>
      </div>

      <div style={card}>
        <h3 style={{ margin: '0 0 8px' }}>Resync</h3>
        <div style={{ color: muted, marginBottom: 8 }}>
          Re-reads all calls and chats of the last days from Retell and rewrites the records. Use it after records were deleted or the analysis was regenerated in Retell.
        </div>
        <input
          style={{ ...input, width: 80, marginRight: 8 }}
          type="number"
          min={1}
          value={resyncDays}
          onChange={(e) => setResyncDays(e.target.value)}
        />
        <span style={{ color: muted, marginRight: 12 }}>days</span>
        <button
          style={button(true)}
          disabled={busy !== null || resyncRunning || !(Number(resyncDays) >= 1)}
          onClick={() =>
            run('resync', async () => {
              await api.post('/s/retell/resync', { days: Number(resyncDays) });
              return 'Resync started';
            })
          }
        >
          {busy === 'resync' ? 'Starting...' : resyncRunning ? 'Running...' : 'Resync'}
        </button>
        {status.resync && (
          <div style={{ marginTop: 12 }}>
            {row('Started', `${when(status.resync.startedAt)} (${status.resync.days} days)`)}
            {row('Status', status.resync.done ? `Finished ${when(status.resync.finishedAt)}` : 'Running, continues every 5 minutes')}
            {row('Calls', resyncCounts(status.resync.calls))}
            {row('Chats', resyncCounts(status.resync.chats))}
          </div>
        )}
      </div>

      {options && (
        <div style={card}>
          <h3 style={{ margin: '0 0 8px' }}>Sync options</h3>
          <div style={{ marginBottom: 8 }}>
            <label>
              <div style={{ color: muted }}>Backfill days: how far the first sync reaches</div>
              <input style={{ ...input, width: 80 }} type="number" min={1} value={options.SYNC_BACKFILL_DAYS ?? ''} onChange={(e) => setOptions({ ...options, SYNC_BACKFILL_DAYS: e.target.value })} />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              <div style={{ color: muted }}>Fields not to store, comma-separated (for example transcript,recording)</div>
              <input style={{ ...input, width: 360 }} value={options.SYNC_EXCLUDE_FIELDS ?? ''} onChange={(e) => setOptions({ ...options, SYNC_EXCLUDE_FIELDS: e.target.value })} />
            </label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={(options.CREATE_PEOPLE ?? 'true').trim().toLowerCase() !== 'false'}
                onChange={(e) => setOptions({ ...options, CREATE_PEOPLE: e.target.checked ? 'true' : 'false' })}
              />
              Create a Person when the number matches nobody
            </label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={(options.LINK_LATEST_OPPORTUNITY ?? 'true').trim().toLowerCase() !== 'false'}
                onChange={(e) => setOptions({ ...options, LINK_LATEST_OPPORTUNITY: e.target.checked ? 'true' : 'false' })}
              />
              Link new calls and chats to the Person's newest opportunity
            </label>
          </div>
          <button style={button()} disabled={busy !== null} onClick={() => void saveOptions()}>Save options</button>
        </div>
      )}

      <div style={card}>
        <h3 style={{ margin: '0 0 8px' }}>Sync schedule</h3>
        <div style={{ color: muted, marginBottom: 8 }}>
          Webhooks deliver new calls within seconds. The scheduled sync closes any gap a missed webhook leaves. Minimum 5 minutes.
        </div>
        <label>
          Every{' '}
          <input style={{ ...input, width: 80 }} type="number" min={5} value={interval} onChange={(e) => setIntervalValue(e.target.value)} />{' '}
          minutes
        </label>{' '}
        <button style={button()} disabled={busy !== null} onClick={() => run('save', async () => { await save(); return 'Saved'; })}>
          Save
        </button>
      </div>

      <div style={card}>
        <h3 style={{ margin: '0 0 8px' }}>Outbound calls and SMS</h3>
        <div style={{ color: muted, marginBottom: 8 }}>
          Defaults for calls and SMS started from Twenty (the "Retell: call person" and "Retell: send SMS" workflow steps and AI tools). Each call or SMS can override them.
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>
            <div style={{ color: muted }}>Call from</div>
            <select style={{ ...input, width: 360 }} value={fromNumber} onChange={(e) => setFromNumber(e.target.value)}>
              <option value="">Not set: every call must name a number</option>
              {status.phoneNumbers.map((n) => (
                <option key={n.number} value={n.number}>
                  {n.number}{n.nickname ? ` (${n.nickname})` : ''}{n.hasOutboundAgent ? '' : ' - no outbound agent'}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            <div style={{ color: muted }}>Agent</div>
            <select style={{ ...input, width: 360 }} value={outboundAgent} onChange={(e) => setOutboundAgent(e.target.value)}>
              <option value="">The outbound agent bound to the number</option>
              {status.agents.filter((a) => a.channel === 'voice').map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
        </div>
        {fromNumber && !outboundAgent && status.phoneNumbers.find((n) => n.number === fromNumber)?.hasOutboundAgent === false && (
          <div style={{ color: '#d9534f', marginBottom: 8 }}>This number has no outbound agent in Retell. Pick an agent above.</div>
        )}
        <div style={{ marginBottom: 8 }}>
          <label>
            <div style={{ color: muted }}>Send SMS from (the number needs SMS enabled in Retell)</div>
            <select style={{ ...input, width: 360 }} value={smsNumber} onChange={(e) => setSmsNumber(e.target.value)}>
              <option value="">Not set: every SMS must name a number</option>
              {status.phoneNumbers.map((n) => (
                <option key={n.number} value={n.number}>
                  {n.number}{n.nickname ? ` (${n.nickname})` : ''}{n.hasSmsAgent ? '' : ' - no SMS agent'}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            <div style={{ color: muted }}>SMS agent</div>
            <select style={{ ...input, width: 360 }} value={smsAgent} onChange={(e) => setSmsAgent(e.target.value)}>
              <option value="">The SMS agent bound to the number</option>
              {status.agents.filter((a) => a.channel === 'chat').map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
        </div>
        <button style={button()} disabled={busy !== null} onClick={() => run('outbound', async () => { await save(); return 'Saved'; })}>
          Save
        </button>
      </div>

      <div style={card}>
        <h3 style={{ margin: '0 0 8px' }}>Webhook</h3>
        <div style={{ color: muted, marginBottom: 8 }}>
          Public address of this Twenty server (leave empty to use the one the server reports).
        </div>
        <input
          style={{ ...input, width: '100%', boxSizing: 'border-box' }}
          placeholder="https://crm.example.com"
          value={publicUrl}
          onChange={(e) => setPublicUrl(e.target.value)}
        />
        <div style={{ marginTop: 12 }}>
          {row('Webhook URL', status.webhookUrl)}
          {!status.webhookUrlIsPublic && (
            <div style={{ color: '#d9534f', padding: '4px 0' }}>
              Retell cannot reach this address from the internet. Enter the public URL above and save.
            </div>
          )}
        </div>
        <button style={button()} onClick={() => void copyToClipboard(status.webhookUrl)}>Copy URL</button>

        <div style={{ margin: '16px 0 8px', color: muted }}>
          Agents that get the webhook. Tick none to use all agents. An agent-level webhook replaces the account-level one for that agent.
        </div>
        {status.agents.length === 0 && <div style={{ color: muted }}>No agents found.</div>}
        {status.agents.map((agent) => (
          <label key={agent.id} style={{ display: 'flex', gap: 8, padding: '4px 0', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={selected.includes(agent.id)}
              onChange={(e) => setSelected(e.target.checked ? [...selected, agent.id] : selected.filter((id) => id !== agent.id))}
            />
            <span>{agent.name}</span>
            <span style={{ color: muted }}>{agent.channel}</span>
            <span style={{ color: agent.hasWebhook ? '#2e9e5b' : muted }}>
              {agent.hasWebhook ? 'webhook set' : agent.webhookUrl ? 'other webhook' : 'no webhook'}
            </span>
          </label>
        ))}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button style={button(true)} disabled={busy !== null} onClick={() => void connect(false)}>
            {busy === 'connect' ? 'Connecting...' : 'Set webhook on agents'}
          </button>
          <button style={button()} disabled={busy !== null} onClick={() => void connect(true)}>
            {busy === 'disconnect' ? 'Removing...' : 'Remove webhook'}
          </button>
        </div>
      </div>
    </div>
  );
};
