import { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import Modal from '@/components/Modal';
import Icon from '@/components/ui/Icon';
import Toast from '@/components/Toast';
import ChannelGlyph from '@/components/ai/ChannelGlyph';
import {
  fetchChannels,
  fetchPlugins,
  createChannel,
  connectChannel,
  connectTelegram,
  disconnectChannel,
  fetchAgents,
  updateChannel,
  type ChannelConnection,
  type Plugin,
  type Agent,
  type ChannelType,
} from '@/lib/agents';

const SURFACE =
  'rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-950/[0.04] dark:ring-gray-800 shadow-card p-6';

const PILL = {
  connected: { cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', label: 'Connected', dot: 'bg-emerald-500' },
  unlinked: { cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', label: 'Not connected', dot: 'bg-gray-400' },
};

// One un-connected state: anything that isn't live reads simply "Not connected".
function StatusPill({ connected }: { connected: boolean }) {
  const m = connected ? PILL.connected : PILL.unlinked;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export default function AiChannelsPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<ChannelConnection[]>([]);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modals
  const [assignConn, setAssignConn] = useState<ChannelConnection | null>(null);
  const [assignAgentId, setAssignAgentId] = useState('');
  const [tgConn, setTgConn] = useState<ChannelConnection | null>(null);
  const [tgToken, setTgToken] = useState('');
  const [embed, setEmbed] = useState<{ name: string; snippet: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, p, a] = await Promise.all([fetchChannels(), fetchPlugins(), fetchAgents().catch(() => [])]);
      setChannels(c);
      setPlugins(p.channels);
      setAgents(a);
    } catch {
      setToast({ message: 'Failed to load channels', type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // Reflect the OAuth redirect result, then clean the URL.
  useEffect(() => {
    if (!router.isReady) return;
    const { connected, error } = router.query;
    if (connected) setToast({ message: `${String(connected)} connected`, type: 'success' });
    else if (error) setToast({ message: 'Connection was cancelled or failed', type: 'error' });
    if (connected || error) router.replace('/ai/channels', undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  const connectionFor = (type: string) => channels.find((c) => c.type === type);
  const agentName = (id?: string) => agents.find((a) => a.id === id)?.name;

  const connect = async (p: Plugin) => {
    setBusy(p.key);
    try {
      let conn = connectionFor(p.key);
      if (!conn) conn = await createChannel({ type: p.key as ChannelType });
      const res = await connectChannel(conn.id);
      if (res.mode === 'oauth') {
        window.location.href = res.authorizeUrl; // hand off to Meta
        return;
      }
      if (res.mode === 'token') {
        setTgToken('');
        setTgConn(conn);
        return;
      }
      // connected (web chat)
      if (res.embedSnippet) setEmbed({ name: p.name, snippet: res.embedSnippet });
      setToast({ message: `${p.name} connected`, type: 'success' });
      await load();
    } catch {
      setToast({ message: `Could not connect ${p.name}`, type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const submitTelegram = async () => {
    if (!tgConn || !tgToken.trim()) return;
    setBusy('telegram');
    try {
      await connectTelegram(tgConn.id, tgToken.trim());
      setTgConn(null);
      setTgToken('');
      await load();
      setToast({ message: 'Telegram connected', type: 'success' });
    } catch {
      setToast({ message: 'Could not verify that bot token', type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async (conn: ChannelConnection, name: string) => {
    setBusy(conn.type);
    try {
      await disconnectChannel(conn.id);
      await load();
      setToast({ message: `${name} disconnected`, type: 'info' });
    } finally {
      setBusy(null);
    }
  };

  const openAssign = (conn: ChannelConnection) => {
    setAssignConn(conn);
    setAssignAgentId(conn.agentId ?? '');
  };
  const saveAssign = async () => {
    if (!assignConn) return;
    try {
      await updateChannel(assignConn.id, { agentId: assignAgentId || undefined });
      setAssignConn(null);
      await load();
      setToast({ message: 'Handling agent updated', type: 'success' });
    } catch {
      setToast({ message: 'Could not assign agent', type: 'error' });
    }
  };

  const copyEmbed = async () => {
    if (!embed) return;
    try { await navigator.clipboard.writeText(embed.snippet); setToast({ message: 'Snippet copied', type: 'success' }); } catch { /* clipboard blocked */ }
  };

  return (
    <div className="kz-stagger space-y-4">
      <PageHeader title="Channels" subtitle="Connect the social and web channels your agents talk on. Credentials are encrypted at rest — never shown here." />

      {loading ? (
        <div className={`${SURFACE} text-center text-sm text-gray-500`}>Loading…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plugins.map((p) => {
            const conn = connectionFor(p.key);
            const connected = conn?.status === 'connected';
            const working = busy === p.key;
            const comingSoon = p.key === 'tiktok';
            const handledBy = connected ? agentName(conn?.agentId) : undefined;
            return (
              <div key={p.key} className={`${SURFACE} kz-lift flex flex-col`}>
                <div className="flex items-start justify-between gap-3">
                  <ChannelGlyph type={p.key as ChannelType} />
                  <StatusPill connected={!comingSoon && connected} />
                </div>

                <div className="mt-3 flex-1">
                  <h3 className="font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">{p.name}</h3>
                  <p className="mt-1 text-[13px] leading-snug text-gray-500 dark:text-gray-400">{p.description}</p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  {comingSoon ? (
                    <Button size="sm" variant="secondary" disabled>Coming soon</Button>
                  ) : connected ? (
                    <>
                      <span className="truncate text-[12px] text-gray-500 dark:text-gray-400">{handledBy || 'Unassigned'}</span>
                      <button
                        onClick={() => openAssign(conn!)}
                        className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-canvas hover:text-accent dark:hover:bg-gray-800"
                        aria-label={`Assign agent for ${p.name}`}
                      >
                        <Icon name="pencil-square" size={16} />
                      </button>
                      <Button size="sm" variant="ghost" onClick={() => disconnect(conn!, p.name)} loading={working}>Disconnect</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => connect(p)} loading={working}>
                      <Icon name="plus" size={15} /> Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign handling agent */}
      <Modal
        isOpen={!!assignConn}
        onClose={() => setAssignConn(null)}
        title="Assign handling agent"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAssignConn(null)}>Cancel</Button>
            <Button onClick={saveAssign}>Save</Button>
          </div>
        }
      >
        <p className="mb-4 text-[13px] text-gray-500 dark:text-gray-400">Choose which agent answers on this channel. Unassigned channels stay quiet until you pick one.</p>
        <FormField
          label="Handled by" name="agentId" type="select" value={assignAgentId}
          onChange={setAssignAgentId}
          options={[{ value: '', label: 'Unassigned' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]}
        />
      </Modal>

      {/* Telegram bot token */}
      <Modal
        isOpen={!!tgConn}
        onClose={() => setTgConn(null)}
        title="Connect Telegram"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTgConn(null)}>Cancel</Button>
            <Button onClick={submitTelegram} loading={busy === 'telegram'}>Connect</Button>
          </div>
        }
      >
        <p className="mb-4 text-[13px] text-gray-500 dark:text-gray-400">
          Create a bot with <span className="font-medium text-gray-700 dark:text-gray-200">@BotFather</span> on Telegram, then paste its token. We verify it and store it encrypted — it is never shown again.
        </p>
        <FormField
          label="Bot token" name="botToken" value={tgToken} onChange={setTgToken}
          placeholder="123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        />
      </Modal>

      {/* Web chat embed snippet */}
      <Modal
        isOpen={!!embed}
        onClose={() => setEmbed(null)}
        title="Web chat is live"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEmbed(null)}>Done</Button>
            <Button onClick={copyEmbed}><Icon name="document-text" size={15} /> Copy snippet</Button>
          </div>
        }
      >
        <p className="mb-3 text-[13px] text-gray-500 dark:text-gray-400">Paste this snippet before <code className="text-gray-700 dark:text-gray-200">&lt;/body&gt;</code> on your site to show the chat widget.</p>
        <pre className="overflow-x-auto rounded-xl bg-canvas p-4 text-[12px] leading-relaxed text-gray-800 ring-1 ring-gray-950/[0.04] dark:bg-gray-800/60 dark:text-gray-100 dark:ring-gray-700">
          <code>{embed?.snippet}</code>
        </pre>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return { props: { ...(await serverSideTranslations(locale || 'en', ['common'])) } };
};
