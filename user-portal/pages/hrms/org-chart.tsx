import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';

interface OrgNode {
  id: string;
  name: string;
  title: string | null;
  department: string | null;
  avatarUrl?: string;
  reports: OrgNode[];
}

const AVATAR_TONES = [
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
];

function initialsOf(name: string): string {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function NodeCard({ node, depth }: { node: OrgNode; depth: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white dark:bg-gray-900 ring-1 ring-gray-950/[0.04] dark:ring-gray-800 shadow-card px-3 py-2.5">
      {node.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={node.avatarUrl}
          alt={node.name}
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
            AVATAR_TONES[depth % AVATAR_TONES.length]
          }`}
        >
          {initialsOf(node.name) || 'U'}
        </span>
      )}
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">
          {node.name || '—'}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {[node.title, node.department].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>
    </div>
  );
}

function OrgTree({ nodes, depth = 0 }: { nodes: OrgNode[]; depth?: number }) {
  return (
    <ul className={depth > 0 ? 'space-y-3 border-l border-gray-200 dark:border-gray-700 pl-4 ml-4' : 'space-y-3'}>
      {nodes.map((node) => (
        <li key={node.id} className="space-y-3">
          <NodeCard node={node} depth={depth} />
          {node.reports && node.reports.length > 0 && (
            <OrgTree nodes={node.reports} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function OrgChartPage() {
  const { t } = useTranslation('common');
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get<{ success: boolean; data: OrgNode[] }>('/hrms/employees/org-chart');
        if (active && res?.success && Array.isArray(res.data)) {
          setNodes(res.data);
        }
      } catch (err) {
        console.error('Failed to load org chart:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <PermissionGuard permission="employees.view">
      <div className="w-full max-w-4xl space-y-6 kz-stagger">
        <PageHeader
          title={t('orgChart') || 'Org chart'}
          subtitle={t('orgChartSubtitle') || 'Your reporting hierarchy'}
          breadcrumbs={[
            { label: 'HR', href: '/hrms/dashboard' },
            { label: t('employees') || 'Employees', href: '/hrms/employees' },
            { label: t('orgChart') || 'Org chart' },
          ]}
        />

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl bg-white dark:bg-gray-900 shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <i className="bx bx-sitemap text-2xl text-gray-400" aria-hidden="true"></i>
            </span>
            <h2 className="font-display text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              {t('orgChartEmptyTitle') || 'No reporting structure yet'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('orgChartEmptyBody') ||
                'Assign managers to your employees to build out the organogram.'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-6">
            <OrgTree nodes={nodes} />
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
