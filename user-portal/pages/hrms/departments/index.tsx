import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Link from 'next/link';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { downloadCsv } from '@/lib/format';

const AVATAR_TONES = [
  'bg-accent-soft text-accent',
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

export default function DepartmentsPage() {
  const { t } = useTranslation('common');
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/hrms/departments');
      if (response.success) {
        setDepartments(response.data);
      }
    } catch (err: any) {
      setError(err.message || t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (typeof window !== 'undefined' && !window.confirm(t('confirmDelete') || 'Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/hrms/departments/${id}`);
      setToast({ message: t('departmentDeleted') || 'Department deleted successfully', type: 'success' });
      await loadDepartments();
    } catch (err: any) {
      setToast({ message: err.response?.data?.message || t('deleteFailed') || 'Failed to delete department', type: 'error' });
    }
  };

  const handleExport = () => {
    downloadCsv(
      'departments.csv',
      ['Name', 'Description', 'Parent', 'Status'],
      departments.map((d) => [d.name || '', d.description || '', d.parent?.name || '', d.isActive ? 'Active' : 'Inactive']),
    );
  };

  return (
      <div className="space-y-6 kz-stagger">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <PageHeader
          title={t('departments')}
          subtitle="How your organisation is structured"
          count={loading ? undefined : departments.length}
          breadcrumbs={[{ label: t('humanResources') }, { label: t('departments') }]}
          actions={
            <>
              <Button size="sm" variant="secondary" onClick={handleExport} disabled={loading || departments.length === 0}>
                <i className="bx bx-download"></i>
                {t('export') === 'export' ? 'Export' : t('export')}
              </Button>
              <PermissionGuard permission="departments.create">
                <Button size="sm" href="/hrms/departments/create">
                  <i className="bx bx-plus"></i>
                  {t('addDepartment')}
                </Button>
              </PermissionGuard>
            </>
          }
        />

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>
          ) : departments.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <i className="bx bx-buildings text-xl text-gray-400 dark:text-gray-500"></i>
              </div>
              <h3 className="font-display text-sm font-semibold tracking-tight text-gray-900 dark:text-white mb-1">{t('noDepartments')}</h3>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">Add your first department to get started</p>
              <PermissionGuard permission="departments.create">
                <Button href="/hrms/departments/create" size="sm">
                  <i className="bx bx-plus"></i>
                  {t('addDepartment')}
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">{t('name')}</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">{t('description')}</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">{t('parent')}</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">{t('status')}</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {departments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((dept, idx) => (
                      <tr key={dept.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar name={dept.name || '#'} i={idx} />
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{dept.name}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-700 dark:text-gray-300">{dept.description || '—'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-700 dark:text-gray-300">{dept.parent?.name || '—'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge variant={dept.isActive ? 'success' : 'info'} label={dept.isActive ? t('active') : t('inactive')} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <PermissionGuard permission="departments.edit">
                              <Link
                                href={`/hrms/departments/${dept.id}/edit`}
                                className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-accent hover:text-accent-hover"
                              >
                                <i className="bx bx-edit"></i>
                              </Link>
                            </PermissionGuard>
                            <PermissionGuard permission="departments.delete">
                              <button
                                onClick={() => handleDelete(dept.id)}
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
              {departments.length > itemsPerPage && (
                <div className="px-6 pb-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(departments.length / itemsPerPage)}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={departments.length}
                    startIndex={(currentPage - 1) * itemsPerPage}
                    endIndex={Math.min(currentPage * itemsPerPage, departments.length)}
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
