import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import StatusBadge, { type StatusBadgeVariant } from '@/components/ui/StatusBadge';

const tableStatusVariant = (status?: string): StatusBadgeVariant => {
  const s = (status || '').toLowerCase();
  if (s === 'available') return 'success';
  if (s === 'occupied') return 'error';
  if (s === 'reserved') return 'pending';
  return 'info';
};

export default function TablesPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/rms/tables');
      if (response.success) {
        setTables(response.data);
      }
    } catch (err) {
      console.error('Failed to load tables:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PermissionGuard permission="tables.view">
      <div className="kz-stagger space-y-4">
        <PageHeader
          title={t('tables') || 'Tables'}
          count={loading ? undefined : tables.length}
          subtitle={t('tables.floorPlanBlurb', 'Your floor plan, seat by seat')}
          breadcrumbs={[{ label: t('restaurant', 'Restaurant') }, { label: t('tables') || 'Tables' }]}
          actions={
            <PermissionGuard permission="tables.create">
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push('/rms/tables/create')}
              >
                <i className="bx bx-plus" aria-hidden="true"></i>
                {t('create')} {t('table')}
              </Button>
            </PermissionGuard>
          }
        />
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : tables.length === 0 ? (
          <EmptyState
            icon="bx-grid-alt"
            title={t('noTablesYet') || 'No tables yet'}
            description={t('createTablesToSeat') || 'Create tables to start seating guests'}
            actions={
              <PermissionGuard permission="tables.create">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/rms/tables/create')}
                >
                  <i className="bx bx-plus" aria-hidden="true"></i>
                  {t('create')} {t('table')}
                </Button>
              </PermissionGuard>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tables.map((table) => (
              <div
                key={table.id}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 p-5 hover:ring-accent-ring transition-shadow duration-150"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <i className="bx bx-grid-alt text-lg" aria-hidden="true"></i>
                    </span>
                    <h3 className="font-display tracking-tight text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{table.name}</h3>
                  </div>
                  <StatusBadge variant={tableStatusVariant(table.status)} label={table.status} size="sm" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <i className="bx bx-user text-gray-400" aria-hidden="true"></i>
                  {t('capacity')}: <span className="tabular-nums font-medium text-gray-700 dark:text-gray-300">{table.capacity}</span> {t('people')}
                </p>
              </div>
            ))}
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

