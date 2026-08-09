import { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Toast from '@/components/Toast';
import ChannelGlyph from '@/components/ai/ChannelGlyph';
import {
  fetchConversations,
  fetchMessages,
  fetchPendingActions,
  takeOverConversation,
  humanReply,
  approveAction,
  rejectAction,
  type Conversation,
  type Message,
  type AgentAction,
} from '@/lib/agents';

const CARD =
  'rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-950/[0.04] dark:ring-gray-800 shadow-card';

function convoPill(s: Conversation['status']) {
  const map: Record<string, { cls: string; label: string; dot: string }> = {
    needs_human: { cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', label: 'Needs human', dot: 'bg-amber-500' },
    human: { cls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400', label: 'Human', dot: 'bg-sky-500' },
    closed: { cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', label: 'Closed', dot: 'bg-gray-400' },
    open: { cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', label: 'Open', dot: 'bg-emerald-500' },
  };
  return map[s] ?? map.open;
}

export default function AiConversationsPage() {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [pending, setPending] = useState<AgentAction[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([fetchConversations(), fetchPendingActions().catch(() => [])]);
      setConvos(c);
      setPending(p);
    } catch {
      setToast({ message: 'Failed to load inbox', type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const open = async (c: Conversation) => {
    setSelected(c);
    try {
      setMessages(await fetchMessages(c.id));
    } catch {
      setMessages([]);
    }
  };

  const takeOver = async () => {
    if (!selected) return;
    try {
      const updated = await takeOverConversation(selected.id);
      setSelected(updated);
      await load();
      setToast({ message: 'You have taken over this conversation', type: 'info' });
    } catch {
      setToast({ message: 'Could not take over', type: 'error' });
    }
  };

  const send = async () => {
    if (!selected || !reply.trim()) return;
    try {
      await humanReply(selected.id, reply.trim());
      setReply('');
      setMessages(await fetchMessages(selected.id));
    } catch {
      setToast({ message: 'Could not send reply', type: 'error' });
    }
  };

  const decide = async (a: AgentAction, ok: boolean) => {
    try {
      if (ok) await approveAction(a.id); else await rejectAction(a.id);
      setToast({ message: ok ? 'Approved — no money moved (Phase 1 guarded stub)' : 'Rejected', type: ok ? 'success' : 'info' });
      await load();
    } catch {
      setToast({ message: 'Could not update action', type: 'error' });
    }
  };

  return (
    <div className="kz-stagger space-y-4">
      <PageHeader title="Conversations" subtitle="Customer threads your agents are handling. Take over any time; money-path actions wait for your approval." />

      {pending.length > 0 && (
        <section className={`${CARD} p-6`}>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <Icon name="shield" size={16} />
            </span>
            <div>
              <h2 className="font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">Waiting for your approval</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Money-path actions an agent proposed. Nothing happens until you approve.</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {pending.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl bg-amber-50/60 px-4 py-3 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:ring-amber-500/20">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium tabular-nums text-gray-900 dark:text-gray-100">{a.tool}</div>
                  {a.reason && <div className="truncate text-xs text-gray-600 dark:text-gray-300">{a.reason}</div>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" onClick={() => decide(a, true)}>Approve</Button>
                  <Button size="sm" variant="ghost" onClick={() => decide(a, false)}>Reject</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Thread list */}
        <div className={`${CARD} overflow-hidden lg:col-span-1`}>
          <div className="border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">Inbox</h2>
          </div>
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500">Loading…</div>
          ) : convos.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-10 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Icon name="inbox-arrow" size={22} />
              </span>
              <p className="mt-3 text-[13px] text-gray-500 dark:text-gray-400">No conversations yet. Test an agent or connect a channel to start one.</p>
            </div>
          ) : (
            <ul className="max-h-[28rem] overflow-y-auto">
              {convos.map((c) => {
                const pill = convoPill(c.status);
                const active = selected?.id === c.id;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => open(c)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${active ? 'bg-accent-soft' : 'hover:bg-canvas dark:hover:bg-gray-800/50'}`}
                    >
                      <ChannelGlyph type={c.channel} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-gray-900 dark:text-gray-100">{c.customerName || c.customerExternalId}</div>
                        <div className="text-xs capitalize text-gray-500 dark:text-gray-400">{c.channel}</div>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${pill.cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
                        {pill.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Reading pane */}
        <div className={`${CARD} flex min-h-[24rem] flex-col overflow-hidden lg:col-span-2`}>
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Icon name="envelope" size={26} />
              </span>
              <h3 className="mt-4 font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">Pick a conversation</h3>
              <p className="mt-1 max-w-xs text-[13px] text-gray-500 dark:text-gray-400">Select a thread on the left to read it and reply.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <ChannelGlyph type={selected.channel} size={36} />
                  <div>
                    <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{selected.customerName || selected.customerExternalId}</div>
                    <div className="text-xs capitalize text-gray-500 dark:text-gray-400">{selected.channel} · {convoPill(selected.status).label}</div>
                  </div>
                </div>
                {selected.status !== 'human' && (
                  <Button size="sm" variant="secondary" onClick={takeOver}><Icon name="user" size={15} /> Take over</Button>
                )}
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4" style={{ maxHeight: '22rem' }}>
                {messages.length === 0 && <div className="text-[13px] text-gray-400">No messages.</div>}
                {messages.map((m) => (
                  <div key={m.id} className={m.direction === 'inbound' ? 'text-left' : 'text-right'}>
                    <span className={`inline-block max-w-[80%] rounded-2xl px-3 py-1.5 text-[13px] ${
                      m.direction === 'inbound'
                        ? 'bg-canvas text-gray-800 ring-1 ring-gray-950/[0.04] dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-700'
                        : m.author === 'human'
                          ? 'bg-sky-500 text-white'
                          : 'bg-accent-gradient text-accent-fg'
                    }`}>{m.content}</span>
                    <div className="mt-0.5 text-[10px] capitalize text-gray-400">{m.author}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 border-t border-gray-100 p-3 dark:border-gray-800">
                <input
                  className="h-9 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder={selected.status === 'human' ? 'Reply as a human…' : 'Reply (this takes over the thread)…'}
                />
                <Button onClick={send}>Send</Button>
              </div>
            </>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return { props: { ...(await serverSideTranslations(locale || 'en', ['common'])) } };
};
