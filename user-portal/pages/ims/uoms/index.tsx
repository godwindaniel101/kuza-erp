import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import StatusBadge from '@/components/ui/StatusBadge';

export default function UomsPage() {
  const { t } = useTranslation('common');
  const [uoms, setUoms] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateConversion, setShowCreateConversion] = useState(false);
  const [newUom, setNewUom] = useState({ name: '', abbreviation: '', isDefault: false });
  const [newConversion, setNewConversion] = useState({ fromUomId: '', toUomId: '', factor: '' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [uomCurrentPage, setUomCurrentPage] = useState(1);
  const [conversionCurrentPage, setConversionCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadUoms();
    loadConversions();
  }, []);

  const loadUoms = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/ims/uoms');
      if (response.success) {
        setUoms(response.data);
      }
    } catch (err) {
      console.error('Failed to load UOMs:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversions = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/ims/uom-conversions');
      if (response.success) {
        setConversions(response.data);
      }
    } catch (err) {
      console.error('Failed to load conversions:', err);
    }
  };

  const inputClass =
    'h-9 w-full px-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-ring focus-visible:border-transparent text-[13px] transition-colors';

  const createUom = async () => {
    try {
      const res = await api.post('/ims/uoms', newUom);
      if (res.success) {
        setShowCreate(false);
        setNewUom({ name: '', abbreviation: '', isDefault: false });
        await loadUoms();
        setToast({ message: t('uomCreated') || 'UOM created successfully', type: 'success' });
      }
    } catch (err) {
      console.error('Failed to create UOM:', err);
      setToast({ message: t('failedToCreateUom') || 'Failed to create UOM', type: 'error' });
    }
  };

  const createConversion = async () => {
    try {
      const res = await api.post('/ims/uom-conversions', newConversion);
      if (res.success) {
        setShowCreateConversion(false);
        setNewConversion({ fromUomId: '', toUomId: '', factor: '' });
        await loadConversions();
        setToast({ message: t('conversionCreated') || 'Conversion created successfully', type: 'success' });
      }
    } catch (err) {
      console.error('Failed to create conversion:', err);
      setToast({ message: t('failedToCreateConversion') || 'Failed to create conversion', type: 'error' });
    }
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="space-y-6 kz-stagger">
        <PageHeader
          title={t('uoms')}
          subtitle={t('uoms.subtitle', 'The units your stock is counted in')}
          breadcrumbs={[{ label: t('inventory') || 'Inventory', href: '/ims/inventory' }, { label: t('uoms') }]}
          actions={
            <PermissionGuard permission="uoms.create">
              <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
                {t('create')} {t('uom')}
              </Button>
            </PermissionGuard>
          }
        />

        {/* UOMs Section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">{t('units')}</h2>
          </div>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
            </div>
          ) : uoms.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <i className="bx bx-ruler text-gray-400 text-2xl"></i>
              </div>
              <h3 className="font-display tracking-tight text-gray-900 dark:text-gray-100 font-semibold">{t('noUomsYet') || 'No units yet'}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('create')} {t('uoms').toLowerCase()}.</p>
              <PermissionGuard permission="uoms.create">
                <Button variant="primary" onClick={() => setShowCreate(true)} className="mt-4">
                  {t('create')} {t('uom')}
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('name')}
                      </th>
                      <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('abbreviation')}
                      </th>
                      <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('default')}
                      </th>
                      <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                    {uoms.slice((uomCurrentPage - 1) * itemsPerPage, uomCurrentPage * itemsPerPage).map((uom) => (
                      <tr key={uom.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium text-gray-900 dark:text-gray-100">
                          <span className="inline-flex items-center gap-2">
                            <i className="bx bx-ruler text-gray-400 dark:text-gray-500" aria-hidden="true"></i>
                            {uom.name}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-300">
                          {uom.abbreviation}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {uom.isDefault && <StatusBadge variant="info" label={t('default')} size="sm" />}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium">
                          <PermissionGuard permission="uoms.edit">
                            <button className="text-accent hover:text-accent-hover mr-3 transition-colors">{t('edit')}</button>
                          </PermissionGuard>
                          <PermissionGuard permission="uoms.delete">
                            <button className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">{t('delete')}</button>
                          </PermissionGuard>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {uoms.length > itemsPerPage && (
                <Pagination
                  currentPage={uomCurrentPage}
                  totalPages={Math.ceil(uoms.length / itemsPerPage)}
                  onPageChange={setUomCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={uoms.length}
                  startIndex={(uomCurrentPage - 1) * itemsPerPage}
                  endIndex={Math.min(uomCurrentPage * itemsPerPage, uoms.length)}
              />
            )}
            </>
          )}
        </div>

        {/* Conversions Section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">{t('conversions') || 'Conversions'}</h2>
            <PermissionGuard permission="uoms.create">
              <Button variant="primary" size="sm" onClick={() => setShowCreateConversion(true)}>
                {t('add')} {t('conversion') || 'Conversion'}
              </Button>
            </PermissionGuard>
          </div>
          {conversions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <Icon name="arrows-right-left" size={24} className="text-gray-400" />
              </div>
              <h3 className="font-display tracking-tight text-gray-900 dark:text-gray-100 font-semibold">{t('noConversionsYet') || 'No conversions yet'}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('addConversionsToConvertBetweenUnits') || 'Add conversions to convert between units'}</p>
              <PermissionGuard permission="uoms.create">
                <Button variant="primary" onClick={() => setShowCreateConversion(true)} className="mt-4">
                  {t('add')} {t('conversion') || 'Conversion'}
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('fromUnit') || 'From Unit'}
                      </th>
                      <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('toUnit') || 'To Unit'}
                      </th>
                      <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('conversionFactor') || 'Factor'}
                      </th>
                      <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('formula') || 'Formula'}
                      </th>
                      <th className="px-6 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                    {conversions.slice((conversionCurrentPage - 1) * itemsPerPage, conversionCurrentPage * itemsPerPage).map((conversion) => (
                      <tr key={conversion.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium text-gray-900 dark:text-gray-100">
                          {conversion.fromUom?.name} ({conversion.fromUom?.abbreviation})
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-300">
                          {conversion.toUom?.name} ({conversion.toUom?.abbreviation})
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-300 tabular-nums">
                          {conversion.factor}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-[13px] text-gray-500 dark:text-gray-300 tabular-nums">
                          1 {conversion.fromUom?.abbreviation} = {conversion.factor} {conversion.toUom?.abbreviation}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-[13px] font-medium">
                          <PermissionGuard permission="uoms.edit">
                            <button className="text-accent hover:text-accent-hover mr-3 transition-colors">{t('edit')}</button>
                          </PermissionGuard>
                          <PermissionGuard permission="uoms.delete">
                            <button className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">{t('delete')}</button>
                          </PermissionGuard>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {conversions.length > itemsPerPage && (
                <div className="px-4 pb-4">
                  <Pagination
                    currentPage={conversionCurrentPage}
                    totalPages={Math.ceil(conversions.length / itemsPerPage)}
                    onPageChange={setConversionCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={conversions.length}
                    startIndex={(conversionCurrentPage - 1) * itemsPerPage}
                    endIndex={Math.min(conversionCurrentPage * itemsPerPage, conversions.length)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title={`${t('create')} ${t('uom')}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>{t('cancel')}</Button>
            <Button
              variant="primary"
              disabled={!newUom.name || !newUom.abbreviation}
              onClick={createUom}
            >
              {t('save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            type="text"
            value={newUom.name}
            onChange={(e) => setNewUom({ ...newUom, name: e.target.value })}
            placeholder={t('name')}
            className={inputClass}
            required
          />
          <input
            type="text"
            value={newUom.abbreviation}
            onChange={(e) => setNewUom({ ...newUom, abbreviation: e.target.value })}
            placeholder={t('abbreviation')}
            className={inputClass}
            required
          />
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={newUom.isDefault}
              onChange={(e) => setNewUom({ ...newUom, isDefault: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-700 text-accent focus:ring-accent-ring"
            />
            <span className="text-sm text-gray-700 dark:text-gray-200">{t('default')}</span>
          </label>
        </div>
      </Modal>

      <Modal
        isOpen={showCreateConversion}
        onClose={() => setShowCreateConversion(false)}
        title={`${t('add')} ${t('conversion') || 'Conversion'}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateConversion(false)}>{t('cancel')}</Button>
            <Button
              variant="primary"
              disabled={!newConversion.fromUomId || !newConversion.toUomId || !newConversion.factor}
              onClick={createConversion}
            >
              {t('save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <select
            value={newConversion.fromUomId}
            onChange={(e) => setNewConversion({ ...newConversion, fromUomId: e.target.value })}
            className={inputClass}
            required
          >
            <option value="">{t('selectFromUnit') || 'Select from unit'}</option>
            {uoms.map((uom) => (
              <option key={uom.id} value={uom.id}>{uom.name} ({uom.abbreviation})</option>
            ))}
          </select>
          <select
            value={newConversion.toUomId}
            onChange={(e) => setNewConversion({ ...newConversion, toUomId: e.target.value })}
            className={inputClass}
            required
          >
            <option value="">{t('selectToUnit') || 'Select to unit'}</option>
            {uoms.map((uom) => (
              <option key={uom.id} value={uom.id}>{uom.name} ({uom.abbreviation})</option>
            ))}
          </select>
          <input
            type="number"
            step="0.001"
            value={newConversion.factor}
            onChange={(e) => setNewConversion({ ...newConversion, factor: e.target.value })}
            placeholder={t('conversionFactor') || 'Conversion factor'}
            className={inputClass}
            required
          />
          {newConversion.fromUomId && newConversion.toUomId && newConversion.factor && (
            <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg tabular-nums">
              {t('preview') || 'Preview'}: 1 {uoms.find(u => u.id === newConversion.fromUomId)?.name} = {newConversion.factor} {uoms.find(u => u.id === newConversion.toUomId)?.name}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};
