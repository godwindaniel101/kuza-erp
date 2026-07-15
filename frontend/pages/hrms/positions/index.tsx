import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Link from 'next/link';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { downloadCsv } from '@/lib/format';

const AVATAR_TONES = [
  'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
];

function Avatar({ name, i }: { name: string; i: number }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${AVATAR_TONES[i % AVATAR_TONES.length]}`}>
      {initials || '#'}
    </span>
  );
}

export default function PositionsPage() {
  const { t } = useTranslation('common');
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/hrms/positions');
      if (response.success) {
        setPositions(response.data);
      }
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (typeof window !== 'undefined' && !window.confirm(t('confirmDelete'))) return;
    try {
      await api.delete(`/hrms/positions/${id}`);
      await loadPositions();
    } catch (err: any) {
      if (typeof window !== 'undefined') {
        alert(err.message || t('deleteFailed'));
      }
    }
  };

  const handleExport = () => {
    downloadCsv(
      'positions.csv',
      ['Title', 'Description', 'Department', 'Status'],
      positions.map((p) => [p.title || '', p.description || '', p.department?.name || '', p.isActive ? 'Active' : 'Inactive']),
    );
  };

  return (
      <div className="space-y-5">
        <PageHeader
          title={t('positions')}
          subtitle="The roles people are hired into"
          count={loading ? undefined : positions.length}
          breadcrumbs={[{ label: t('humanResources') }, { label: t('positions') }]}
          actions={
            <>
              <Button size="sm" variant="secondary" onClick={handleExport} disabled={loading || positions.length === 0}>
                <i className="bx bx-download"></i>
                {t('export') === 'export' ? 'Export' : t('export')}
              </Button>
              <PermissionGuard permission="positions.create">
                <Button size="sm" href="/hrms/positions/create">
                  <i className="bx bx-plus"></i>
                  {t('addPosition')}
                </Button>
              </PermissionGuard>
            </>
          }
        />

        <div className="bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>
          ) : positions.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <i className="bx bx-briefcase text-xl text-gray-400 dark:text-gray-500"></i>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t('noPositions')}</h3>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">Add your first position to get started</p>
              <PermissionGuard permission="positions.create">
                <Button href="/hrms/positions/create" size="sm">
                  <i className="bx bx-plus"></i>
                  {t('addPosition')}
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('title')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('department')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('status')}</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {positions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((position, idx) => (
                      <tr key={position.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar name={position.title || '#'} i={idx} />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{position.title}</div>
                              {position.description && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{position.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-700 dark:text-gray-300">{position.department?.name || '—'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge variant={position.isActive ? 'success' : 'info'} label={position.isActive ? t('active') : t('inactive')} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <PermissionGuard permission="positions.edit">
                              <Link
                                href={`/hrms/positions/${position.id}/edit`}
                                className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                              >
                                <i className="bx bx-edit"></i>
                              </Link>
                            </PermissionGuard>
                            <PermissionGuard permission="positions.delete">
                              <button
                                onClick={() => handleDelete(position.id)}
                                className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                              >
                                <i className="bx bx-trash"></i>
                              </button>
                            </PermissionGuard>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {positions.length > itemsPerPage && (
                <div className="px-6 pb-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(positions.length / itemsPerPage)}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={positions.length}
                    startIndex={(currentPage - 1) * itemsPerPage}
                    endIndex={Math.min(currentPage * itemsPerPage, positions.length)}
                  />
                </div>
              )}
            </>
          )}
        </div>
  </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
