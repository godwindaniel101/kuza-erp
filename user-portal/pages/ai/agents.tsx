import { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import Modal from '@/components/Modal';
import Icon from '@/components/ui/Icon';
import Toast from '@/components/Toast';
import {
  fetchAgents,
  createAgent,
  setAgentStatus,
  deleteAgent,
  fetchPlugins,
  sendInbound,
  type Agent,
  type Plugin,
} from '@/lib/agents';

const SURFACE =
  'rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-950/[0.04] dark:ring-gray-800 shadow-card p-6';

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
}

const PILL = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  paused: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

function StatusPill({ active }: { active: boolean }) {
  const cls = active ? PILL.active : PILL.paused;
  const dot = active ? 'bg-emerald-500' : 'bg-gray-400';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {active ? 'Active' : 'Paused'}
    </span>
  );
}

export default function AiAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [capabilities, setCapabilities] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', tone: 'friendly', voice: '', systemPromptExtras: '' });
  const [caps, setCaps] = useState<string[]>(['catalog', 'knowledge']);
  const [saving, setSaving] = useState(false);

  const [previewAgent, setPreviewAgent] = useState<Agent | null>(null);
  const [previewMsg, setPreviewMsg] = useState('');
  const [previewLog, setPreviewLog] = useState<{ who: 'You' | 'Agent'; text: string }[]>([]);
  const [previewBusy, setPreviewBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([fetchAgents(), fetchPlugins()]);
      setAgents(a);
      setCapabilities(p.capabilities);
    } catch {
      setToast({ message: 'Failed to load agents', type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const toggleCap = (key: string) =>
    setCaps((c) => (c.includes(key) ? c.filter((k) => k !== key) : [...c, key]));

  const resetForm = () => {
    setForm({ name: '', tone: 'friendly', voice: '', systemPromptExtras: '' });
    setCaps(['catalog', 'knowledge']);
  };

  const submit = async () => {
    if (!form.name.trim()) { setToast({ message: 'Give your agent a name', type: 'error' }); return; }
    setSaving(true);
    try {
      await createAgent({ ...form, enabledCapabilities: caps });
      setToast({ message: 'Agent created', type: 'success' });
      setShowForm(false);
      resetForm();
      await load();
    } catch {
      setToast({ message: 'Could not create agent', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (a: Agent) => {
    try {
      await setAgentStatus(a.id, a.status === 'active' ? 'paused' : 'active');
      await load();
    } catch {
      setToast({ message: 'Could not update agent', type: 'error' });
    }
  };

  const remove = async (a: Agent) => {
    if (!confirm(`Delete agent "${a.name}"?`)) return;
    try {
      await deleteAgent(a.id);
      await load();
      setToast({ message: 'Agent deleted', type: 'info' });
    } catch {
      setToast({ message: 'Could not delete agent', type: 'error' });
    }
  };

  const openPreview = (a: Agent) => { setPreviewAgent(a); setPreviewLog([]); setPreviewMsg(''); };

  const runPreview = async () => {
    if (!previewAgent || !previewMsg.trim()) return;
    const text = previewMsg.trim();
    setPreviewLog((l) => [...l, { who: 'You', text }]);
    setPreviewMsg('');
    setPreviewBusy(true);
    try {
      const res = await sendInbound({ agentId: previewAgent.id, message: text, channel: 'webchat' });
      const reply = res.reply?.content ??
        (res.conversation.status === 'needs_human'
          ? '(Handed off to a human — money-path intent detected.)'
          : '(No reply — the AI provider may be unavailable.)');
      setPreviewLog((l) => [...l, { who: 'Agent', text: reply }]);
    } catch {
      setPreviewLog((l) => [...l, { who: 'Agent', text: '(Error contacting the runtime.)' }]);
    } finally {
      setPreviewBusy(false);
    }
  };

  return (
    <div className="kz-stagger space-y-6">
      <PageHeader
        title="Agents"
        subtitle="Create AI personas, assign what they can do, and pause or activate them."
        actions={<Button size="sm" onClick={() => setShowForm(true)}><Icon name="plus" size={15} /> New agent</Button>}
      />

      {loading ? (
        <div className={`${SURFACE} text-center text-sm text-gray-500`}>Loading…</div>
      ) : agents.length === 0 ? (
        <div className={`${SURFACE} flex flex-col items-center py-12 text-center`}>
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Icon name="sparkles" size={26} />
          </span>
          <h3 className="mt-4 font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">No agents yet</h3>
          <p className="mt-1 max-w-xs text-[13px] text-gray-500 dark:text-gray-400">Create your first AI agent to start answering customers across your channels.</p>
          <div className="mt-4"><Button onClick={() => setShowForm(true)}><Icon name="plus" size={15} /> New agent</Button></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {agents.map((a) => (
            <div key={a.id} className={`${SURFACE} kz-lift flex flex-col`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {a.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft font-display text-sm font-semibold text-accent">
                      {initials(a.name)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">{a.name}</h3>
                    {a.tone && <div className="text-xs capitalize text-gray-500 dark:text-gray-400">{a.tone}</div>}
                  </div>
                </div>
                <StatusPill active={a.status === 'active'} />
              </div>

              {(a.enabledCapabilities ?? []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(a.enabledCapabilities ?? []).map((k) => (
                    <span key={k} className="rounded-md bg-canvas px-2 py-0.5 text-[11px] font-medium capitalize text-gray-600 dark:bg-gray-800 dark:text-gray-300">{k}</span>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => openPreview(a)}><Icon name="sparkles" size={15} /> Test</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleStatus(a)}>{a.status === 'active' ? 'Pause' : 'Activate'}</Button>
                <button onClick={() => remove(a)} className="ml-auto text-gray-400 transition-colors hover:text-red-500" aria-label={`Delete ${a.name}`}>
                  <Icon name="x-mark" size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create agent — protected-focus task (DESIGN §6) */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); resetForm(); }}
        title="New agent"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            <Button onClick={submit} loading={saving}>Create agent</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="rounded-xl bg-accent-soft px-3 py-2 text-[12px] text-accent">
            Personas converse and read only — money actions always need a human. Safety rules apply on top of anything you write here.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Name" name="name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Ada from SnackHub" required />
            <FormField
              label="Tone" name="tone" type="select" value={form.tone}
              onChange={(v) => setForm((f) => ({ ...f, tone: v }))}
              options={[
                { value: 'friendly', label: 'Friendly' },
                { value: 'professional', label: 'Professional' },
                { value: 'playful', label: 'Playful' },
                { value: 'concise', label: 'Concise' },
              ]}
            />
          </div>
          <FormField label="Voice / persona" name="voice" type="textarea" rows={2} value={form.voice} onChange={(v) => setForm((f) => ({ ...f, voice: v }))} placeholder="How should this agent come across? e.g. warm, uses a little Pidgin, greets first." />
          <FormField label="Extra instructions" name="systemPromptExtras" type="textarea" rows={2} value={form.systemPromptExtras} onChange={(v) => setForm((f) => ({ ...f, systemPromptExtras: v }))} placeholder="Anything specific about your business the agent should know." />
          <div>
            <div className="mb-2 text-[13px] font-medium text-gray-900 dark:text-gray-100">Capabilities</div>
            <div className="flex flex-wrap gap-2">
              {capabilities.map((c) => {
                const on = caps.includes(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleCap(c.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      on
                        ? 'border-transparent bg-accent text-accent-fg'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {on && <Icon name="check" size={13} />}
                    {c.name}{c.moneyPath ? ' · human-approved' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Test conversation */}
      <Modal
        isOpen={!!previewAgent}
        onClose={() => setPreviewAgent(null)}
        title={previewAgent ? `Test — ${previewAgent.name}` : 'Test'}
      >
        <div className="space-y-3">
          <div className="flex max-h-80 min-h-[11rem] flex-col gap-2 overflow-y-auto rounded-xl bg-canvas p-3 dark:bg-gray-800/40">
            {previewLog.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon name="sparkles" size={18} />
                </span>
                <p className="mt-2 text-[13px] text-gray-400">Say hi to start the conversation.</p>
              </div>
            ) : (
              previewLog.map((m, i) => (
                <div key={i} className={m.who === 'You' ? 'text-right' : 'text-left'}>
                  <span className={`inline-block max-w-[85%] rounded-2xl px-3 py-1.5 text-[13px] ${m.who === 'You' ? 'bg-accent-gradient text-accent-fg' : 'bg-white text-gray-800 ring-1 ring-gray-950/[0.04] dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-800'}`}>{m.text}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              className="h-9 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              value={previewMsg}
              onChange={(e) => setPreviewMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runPreview()}
              placeholder="Type a message…"
              aria-label="Message"
            />
            <Button onClick={runPreview} loading={previewBusy}>Send</Button>
          </div>
          <p className="text-[11px] text-gray-400">Preview — nothing reaches real customers.</p>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return { props: { ...(await serverSideTranslations(locale || 'en', ['common'])) } };
};
