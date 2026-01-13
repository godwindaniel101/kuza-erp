import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Pagination from '@/components/Pagination';

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

  return (
    <div className="p-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('uoms')}</h1>
        <PermissionGuard permission="uoms.create">
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm">
            {t('create')} {t('uom')}
          </button>
        </PermissionGuard>
      </div>

      {/* UOMs Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('units')}</h2>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : uoms.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
              <i className="bx bx-ruler text-gray-400 text-2xl"></i>
            </div>
            <h3 className="text-gray-900 dark:text-gray-100 font-medium">{t('noUomsYet') || 'No units yet'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('create')} {t('uoms').toLowerCase()}.</p>
            <PermissionGuard permission="uoms.create">
              <button onClick={() => setShowCreate(true)} className="inline-flex items-center mt-4 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm">
                {t('create')} {t('uom')}
              </button>
            </PermissionGuard>
          </div>
        ) : (
          <>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('abbreviation')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('default')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {uoms.slice((uomCurrentPage - 1) * itemsPerPage, uomCurrentPage * itemsPerPage).map((uom) => (
                    <tr key={uom.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {uom.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {uom.abbreviation}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {uom.isDefault && (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {t('default')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <PermissionGuard permission="uoms.edit">
                          <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3">{t('edit')}</button>
                        </PermissionGuard>
                        <PermissionGuard permission="uoms.delete">
                          <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">{t('delete')}</button>
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('conversions') || 'Conversions'}</h2>
          <PermissionGuard permission="uoms.create">
            <button onClick={() => setShowCreateConversion(true)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
              {t('add')} {t('conversion') || 'Conversion'}
            </button>
          </PermissionGuard>
        </div>
        {conversions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
              <i className="bx bx-transfer text-gray-400 text-2xl"></i>
            </div>
            <h3 className="text-gray-900 dark:text-gray-100 font-medium">{t('noConversionsYet') || 'No conversions yet'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('addConversionsToConvertBetweenUnits') || 'Add conversions to convert between units'}</p>
            <PermissionGuard permission="uoms.create">
              <button onClick={() => setShowCreateConversion(true)} className="inline-flex items-center mt-4 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm">
                {t('add')} {t('conversion') || 'Conversion'}
              </button>
            </PermissionGuard>
          </div>
        ) : (
          <>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('fromUnit') || 'From Unit'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('toUnit') || 'To Unit'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('conversionFactor') || 'Factor'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('formula') || 'Formula'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {conversions.slice((conversionCurrentPage - 1) * itemsPerPage, conversionCurrentPage * itemsPerPage).map((conversion) => (
                    <tr key={conversion.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {conversion.fromUom?.name} ({conversion.fromUom?.abbreviation})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {conversion.toUom?.name} ({conversion.toUom?.abbreviation})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {conversion.factor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        1 {conversion.fromUom?.abbreviation} = {conversion.factor} {conversion.toUom?.abbreviation}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <PermissionGuard permission="uoms.edit">
                          <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3">{t('edit')}</button>
                        </PermissionGuard>
                        <PermissionGuard permission="uoms.delete">
                          <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">{t('delete')}</button>
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

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('create')} {t('uom')}</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newUom.name}
                onChange={(e) => setNewUom({ ...newUom, name: e.target.value })}
                placeholder={t('name')}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                required
              />
              <input
                type="text"
                value={newUom.abbreviation}
                onChange={(e) => setNewUom({ ...newUom, abbreviation: e.target.value })}
                placeholder={t('abbreviation')}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                required
              />
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newUom.isDefault}
                  onChange={(e) => setNewUom({ ...newUom, isDefault: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-700"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">{t('default')}</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-3 border border-gray-300 dark:border-gray-700 dark:text-gray-200 rounded-md" onClick={() => setShowCreate(false)}>{t('cancel')}</button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
                disabled={!newUom.name || !newUom.abbreviation}
                onClick={async () => {
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
                }}
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateConversion && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('add')} {t('conversion') || 'Conversion'}</h3>
            <div className="space-y-3">
              <select
                value={newConversion.fromUomId}
                onChange={(e) => setNewConversion({ ...newConversion, fromUomId: e.target.value })}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
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
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
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
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
                required
              />
              {newConversion.fromUomId && newConversion.toUomId && newConversion.factor && (
                <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {t('preview') || 'Preview'}: 1 {uoms.find(u => u.id === newConversion.fromUomId)?.name} = {newConversion.factor} {uoms.find(u => u.id === newConversion.toUomId)?.name}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-700 dark:text-gray-200 rounded-md" onClick={() => setShowCreateConversion(false)}>{t('cancel')}</button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
                disabled={!newConversion.fromUomId || !newConversion.toUomId || !newConversion.factor}
                onClick={async () => {
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
                }}
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
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

