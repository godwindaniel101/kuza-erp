import { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import Icon from '@/components/ui/Icon';
import Toast from '@/components/Toast';
import {
  fetchKnowledge,
  createKnowledge,
  deleteKnowledge,
  type KnowledgeDoc,
} from '@/lib/agents';

const SURFACE =
  'rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-950/[0.04] dark:ring-gray-800 shadow-card p-6';

const TYPE_LABEL: Record<string, string> = { faq: 'FAQ', policy: 'Policy', catalog: 'Catalog', freeform: 'Note' };

export default function AiTrainingPage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [form, setForm] = useState({ title: '', type: 'faq', content: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setDocs(await fetchKnowledge());
    } catch {
      setToast({ message: 'Failed to load training docs', type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.title.trim()) { setToast({ message: 'Add a title', type: 'error' }); return; }
    setSaving(true);
    try {
      await createKnowledge({ title: form.title, type: form.type as KnowledgeDoc['type'], content: form.content });
      setForm({ title: '', type: 'faq', content: '' });
      await load();
      setToast({ message: 'Saved', type: 'success' });
    } catch {
      setToast({ message: 'Could not save', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: KnowledgeDoc) => {
    if (!confirm(`Delete "${d.title}"?`)) return;
    try {
      await deleteKnowledge(d.id);
      await load();
    } catch {
      setToast({ message: 'Could not delete', type: 'error' });
    }
  };

  return (
    <div className="kz-stagger space-y-4">
      <PageHeader title="Training" subtitle="Teach your agents your FAQ, policies and product facts. Agents read this to answer — they never change it." />

      <section className={SURFACE}>
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">Add training</h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">FAQ answers, return / shipping policy, hours, or any fact your agents should know.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <FormField label="Title" name="title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="e.g. Do you deliver on Sundays?" required />
          </div>
          <FormField
            label="Type" name="type" type="select" value={form.type}
            onChange={(v) => setForm((f) => ({ ...f, type: v }))}
            options={[
              { value: 'faq', label: 'FAQ' },
              { value: 'policy', label: 'Policy' },
              { value: 'catalog', label: 'Catalog note' },
              { value: 'freeform', label: 'General note' },
            ]}
          />
        </div>
        <div className="mt-4">
          <FormField label="Content" name="content" type="textarea" rows={3} value={form.content} onChange={(v) => setForm((f) => ({ ...f, content: v }))} placeholder="Write the answer or fact the agent should use." />
        </div>
        <div className="mt-4">
          <Button onClick={submit} loading={saving}>Save training</Button>
        </div>
      </section>

      <section className={`${SURFACE} flex items-start gap-3`}>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Icon name="cube" size={20} />
        </span>
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">Catalog sync</h2>
          <p className="mt-0.5 text-[13px] text-gray-500 dark:text-gray-400">
            Your product catalog is read live by agents with the Catalog capability — products, prices and availability come straight from Inventory. No manual sync needed.
          </p>
        </div>
      </section>

      {loading ? (
        <div className={`${SURFACE} text-center text-sm text-gray-500`}>Loading…</div>
      ) : docs.length === 0 ? (
        <div className={`${SURFACE} flex flex-col items-center py-12 text-center`}>
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Icon name="book-open" size={26} />
          </span>
          <h3 className="mt-4 font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">No training yet</h3>
          <p className="mt-1 max-w-xs text-[13px] text-gray-500 dark:text-gray-400">Add your first FAQ or policy so agents can answer accurately.</p>
        </div>
      ) : (
        <section className={SURFACE}>
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">Training library</h2>
          <ul className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
            {docs.map((d) => (
              <li key={d.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Icon name={d.type === 'policy' ? 'shield' : d.type === 'catalog' ? 'cube' : 'document-text'} size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{d.title}</span>
                      <span className="rounded-full bg-canvas px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">{TYPE_LABEL[d.type] ?? d.type}</span>
                      {d.status === 'archived' && <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">Archived</span>}
                    </div>
                    {d.content && <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{d.content}</p>}
                  </div>
                </div>
                <button onClick={() => remove(d)} className="shrink-0 text-gray-400 transition-colors hover:text-red-500" aria-label={`Delete ${d.title}`}>
                  <Icon name="x-mark" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return { props: { ...(await serverSideTranslations(locale || 'en', ['common'])) } };
};
