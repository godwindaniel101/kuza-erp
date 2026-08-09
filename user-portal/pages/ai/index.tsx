import { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import PageHeader from '@/components/ui/PageHeader';
import Icon, { IconName } from '@/components/ui/Icon';
import {
  fetchPlugins,
  fetchAgents,
  fetchChannels,
  fetchConversations,
  type Plugin,
} from '@/lib/agents';

const SURFACE =
  'rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-950/[0.04] dark:ring-gray-800 shadow-card p-6';

const STATUS_PILL = {
  live: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  soon: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const SAFETY: { icon: IconName; text: JSX.Element }[] = [
  { icon: 'sparkles', text: <><strong className="font-semibold text-gray-900 dark:text-gray-100">Converse &amp; read only.</strong> Agents look up catalog, prices and FAQ — they never move money on their own.</> },
  { icon: 'user', text: <><strong className="font-semibold text-gray-900 dark:text-gray-100">Human in the loop.</strong> Buying, paying, refunds and delivery always wait for a person to approve in the inbox.</> },
  { icon: 'lock', text: <><strong className="font-semibold text-gray-900 dark:text-gray-100">No secrets stored.</strong> Channel connections keep references only; payments confirm solely via verified webhooks.</> },
  { icon: 'shield', text: <><strong className="font-semibold text-gray-900 dark:text-gray-100">Fully audited.</strong> Every action an agent takes is logged for review.</> },
];

export default function AiOverviewPage() {
  const [capabilities, setCapabilities] = useState<Plugin[]>([]);
  const [counts, setCounts] = useState({ agents: 0, channels: 0, conversations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, agents, channels, convos] = await Promise.all([
          fetchPlugins(),
          fetchAgents().catch(() => []),
          fetchChannels().catch(() => []),
          fetchConversations().catch(() => []),
        ]);
        setCapabilities(p.capabilities);
        setCounts({ agents: agents.length, channels: channels.length, conversations: convos.length });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats: { label: string; value: number; icon: IconName }[] = [
    { label: 'Agents', value: counts.agents, icon: 'sparkles' },
    { label: 'Channels', value: counts.channels, icon: 'squares-2x2' },
    { label: 'Conversations', value: counts.conversations, icon: 'inbox-arrow' },
  ];

  return (
    <div className="kz-stagger space-y-4">
      <PageHeader
        title="Kuza AI Agents"
        subtitle="AI personas that sell and serve your customers across social channels — read-only and human-gated by design."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white dark:bg-gray-900 ring-1 ring-gray-950/[0.04] dark:ring-gray-800 shadow-card p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon name={s.icon} size={20} />
              </span>
              <div>
                <div className="font-display text-2xl font-semibold tracking-tight tabular-nums text-gray-900 dark:text-gray-100">
                  {loading ? '—' : s.value}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className={SURFACE}>
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">Safety model</h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">How Kuza Agents stay safe on the money path.</p>
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SAFETY.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-xl bg-canvas dark:bg-gray-800/40 p-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon name={s.icon} size={16} />
              </span>
              <span className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">{s.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={SURFACE}>
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">What your agents can do</h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Capabilities you switch on per agent. Money actions stay human-approved.</p>
        <ul className="mt-4 space-y-2">
          {capabilities.map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-3 rounded-xl bg-canvas dark:bg-gray-800/40 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                  {c.moneyPath && (
                    <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">human-approved</span>
                  )}
                </div>
                <div className="truncate text-xs text-gray-500 dark:text-gray-400">{c.description}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${c.status === 'live' ? STATUS_PILL.live : STATUS_PILL.soon}`}>
                {c.status === 'live' ? 'Live' : 'Soon'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return { props: { ...(await serverSideTranslations(locale || 'en', ['common'])) } };
};
