import { useState, useEffect, useMemo } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';

export default function UomsSettingsPage() {
  const { t } = useTranslation('common');
  const [uoms, setUoms] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'uoms' | 'conversions'>('uoms');
  const [loading, setLoading] = useState(true);
  const [showUomModal, setShowUomModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [showConversionsViewModal, setShowConversionsViewModal] = useState(false);
  const [selectedUomForConversions, setSelectedUomForConversions] = useState<any>(null);
  const [uomConversions, setUomConversions] = useState<any[]>([]);
  const [loadingConversions, setLoadingConversions] = useState(false);
  const [uomForm, setUomForm] = useState({ name: '', abbreviation: '', isDefault: false });
  const [conversionForm, setConversionForm] = useState({ fromUomId: '', toUomId: '', multiplier: '' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [uomsRes, conversionsRes] = await Promise.all([
        api.get<{ success: boolean; data: any[] }>('/ims/uoms'),
        api.get<{ success: boolean; data: any[] }>('/ims/uom-conversions'),
      ]);
      if (uomsRes.success) setUoms(uomsRes.data);
      if (conversionsRes.success) setConversions(conversionsRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
      setToast({ message: t('failedToLoadData') || 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/ims/uoms', {
        name: uomForm.name,
        abbreviation: uomForm.abbreviation,
        isDefault: uomForm.isDefault,
      });
      if (res.success) {
        setShowUomModal(false);
        setUomForm({ name: '', abbreviation: '', isDefault: false });
        setToast({ message: t('uomCreated') || 'UOM created successfully', type: 'success' });
        await loadData();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t('failedToCreateUom') || 'Failed to create UOM';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (conversionForm.fromUomId === conversionForm.toUomId) {
      setToast({ message: t('cannotConvertSameUnit') || 'Cannot convert between the same unit', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/ims/uom-conversions', {
        fromUomId: conversionForm.fromUomId,
        toUomId: conversionForm.toUomId,
        factor: parseFloat(conversionForm.multiplier),
      });
      if (res.success) {
        setShowConversionModal(false);
        setConversionForm({ fromUomId: '', toUomId: '', multiplier: '' });
        setToast({ message: t('conversionCreated') || 'Conversion created successfully', type: 'success' });
        await loadData();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t('failedToCreateConversion') || 'Failed to create conversion';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConversion = async (id: string) => {
    if (typeof window !== 'undefined' && !window.confirm(t('confirmDelete') || 'Are you sure you want to delete this conversion?')) {
      return;
    }
    try {
      const res = await api.delete(`/ims/uom-conversions/${id}`);
      if (res.success) {
        setToast({ message: t('conversionDeleted') || 'Conversion deleted successfully', type: 'success' });
        await loadData();
        // Reload conversions if viewing a UOM's conversions
        if (selectedUomForConversions) {
          await loadConversionsForUom(selectedUomForConversions.id);
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t('failedToDeleteConversion') || 'Failed to delete conversion';
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  const loadConversionsForUom = async (uomId: string) => {
    setLoadingConversions(true);
    try {
      const res = await api.get(`/ims/uom-conversions/for-uom/${uomId}`);
      if (res.success) {
        setUomConversions(res.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load conversions for UOM:', err);
      setToast({ message: err.response?.data?.message || t('failedToLoadData') || 'Failed to load conversions', type: 'error' });
      setUomConversions([]);
    } finally {
      setLoadingConversions(false);
    }
  };

  const handleViewConversions = async (uom: any) => {
    setSelectedUomForConversions(uom);
    setShowConversionsViewModal(true);
    await loadConversionsForUom(uom.id);
  };

  // Calculate conversion example text
  const conversionExample = useMemo(() => {
    if (!conversionForm.fromUomId || !conversionForm.toUomId || !conversionForm.multiplier) {
      return '';
    }
    const fromUom = uoms.find(u => u.id === conversionForm.fromUomId);
    const toUom = uoms.find(u => u.id === conversionForm.toUomId);
    if (!fromUom || !toUom) return '';

    const mult = parseFloat(conversionForm.multiplier);
    if (isNaN(mult) || mult <= 0) return '';

    const fromName = fromUom.name.toLowerCase();
    const toName = toUom.name.toLowerCase();
    let formattedMult = mult % 1 === 0 ? mult.toString() : mult.toString().replace(/\.?0+$/, '');

    // For multipliers < 1, show the inverse for better clarity
    if (mult < 1 && mult > 0) {
      const inverse = 1 / mult;
      const formattedInverse = inverse % 1 === 0 ? inverse.toString() : inverse.toFixed(6).replace(/\.?0+$/, '');
      return `1 ${fromName} contains ${formattedInverse} ${toName}${formattedInverse !== '1' ? 's' : ''} (or 1 ${toName} = ${formattedMult} ${fromName})`;
    }

    return `1 ${fromName} contains ${formattedMult} ${toName}${formattedMult !== '1' ? 's' : ''}`;
  }, [conversionForm.fromUomId, conversionForm.toUomId, conversionForm.multiplier, uoms]);

  return (
    <div className="p-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('uoms')}</h1>

      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('uoms')}
            className={`py-2 px-4 border-b-2 transition-colors ${
              activeTab === 'uoms'
                ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('uoms')} ({uoms.length})
          </button>
          <button
            onClick={() => setActiveTab('conversions')}
            className={`py-2 px-4 border-b-2 transition-colors ${
              activeTab === 'conversions'
                ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('conversions')} ({conversions.length})
          </button>
        </nav>
      </div>

      {activeTab === 'uoms' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <PermissionGuard permission="uoms.create">
              <button
                onClick={() => setShowUomModal(true)}
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {t('add')} {t('uom')}
              </button>
            </PermissionGuard>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : uoms.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                <i className="bx bx-ruler text-gray-400 dark:text-gray-500 text-2xl"></i>
              </div>
              <h3 className="text-gray-900 dark:text-gray-100 font-medium">{t('noUomsYet') || 'No units of measure yet'}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('addYourFirstUom') || 'Add your first unit of measure to get started'}</p>
              <PermissionGuard permission="uoms.create">
                <button
                  onClick={() => setShowUomModal(true)}
                  className="mt-4 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {t('add')} {t('uom')}
                </button>
              </PermissionGuard>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('name')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('abbreviation')}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('default')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('actions') || 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {uoms.map((uom) => (
                      <tr key={uom.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{uom.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">{uom.abbreviation || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {uom.isDefault && (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                              {t('default')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewConversions(uom)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-4"
                            title={t('viewConversions') || 'View all conversions'}
                          >
                            {t('viewConversions') || 'View Conversions'}
                          </button>
                          <PermissionGuard permission="uoms.delete">
                            <button
                              onClick={async () => {
                                if (typeof window !== 'undefined' && window.confirm(t('confirmDelete') || 'Are you sure you want to delete this UOM?')) {
                                  try {
                                    await api.delete(`/ims/uoms/${uom.id}`);
                                    setToast({ message: t('uomDeleted') || 'UOM deleted successfully', type: 'success' });
                                    await loadData();
                                  } catch (err: any) {
                                    setToast({ message: err.response?.data?.message || t('failedToDeleteUom') || 'Failed to delete UOM', type: 'error' });
                                  }
                                }
                              }}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            >
                              {t('delete')}
                            </button>
                          </PermissionGuard>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'conversions' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <PermissionGuard permission="uoms.create">
              <button
                onClick={() => setShowConversionModal(true)}
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {t('add')} {t('conversion')}
              </button>
            </PermissionGuard>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : conversions.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                <i className="bx bx-transfer text-gray-400 dark:text-gray-500 text-2xl"></i>
              </div>
              <h3 className="text-gray-900 dark:text-gray-100 font-medium">{t('noConversionsYet')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('addYourFirstConversion')}</p>
              <PermissionGuard permission="uoms.create">
                <button
                  onClick={() => setShowConversionModal(true)}
                  className="mt-4 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {t('add')} {t('conversion')}
                </button>
              </PermissionGuard>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('from')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('factor')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('to')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('explanation') || 'Explanation'}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('actions') || 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {conversions.map((conv) => {
                      const fromName = conv.fromUom?.name?.toLowerCase() || 'unit';
                      const toName = conv.toUom?.name?.toLowerCase() || 'unit';
                      const mult = Number(conv.factor);
                      let formattedMult = mult % 1 === 0 ? mult.toString() : mult.toString().replace(/\.?0+$/, '');
                      let explanation = '';
                      
                      if (mult < 1 && mult > 0) {
                        const inverse = 1 / mult;
                        const formattedInverse = inverse % 1 === 0 ? inverse.toString() : inverse.toFixed(6).replace(/\.?0+$/, '');
                        explanation = `1 ${fromName} contains ${formattedInverse} ${toName}${formattedInverse !== '1' ? 's' : ''} (or 1 ${toName} = ${formattedMult} ${fromName})`;
                      } else {
                        explanation = `1 ${fromName} contains ${formattedMult} ${toName}${formattedMult !== '1' ? 's' : ''}`;
                      }
                      
                      return (
                        <tr key={conv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {conv.fromUom?.name || 'Unit'}
                              {conv.fromUom?.abbreviation && (
                                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({conv.fromUom.abbreviation})</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formattedMult}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {conv.toUom?.name || 'Unit'}
                              {conv.toUom?.abbreviation && (
                                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({conv.toUom.abbreviation})</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                              {explanation}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <PermissionGuard permission="uoms.delete">
                              <button
                                onClick={() => handleDeleteConversion(conv.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                              >
                                {t('delete')}
                              </button>
                            </PermissionGuard>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* UOM Modal */}
      <Modal
        isOpen={showUomModal}
        onClose={() => setShowUomModal(false)}
        title={`${t('add')} ${t('uom')}`}
        maxWidth="md"
      >
            <form onSubmit={handleCreateUom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={uomForm.name}
                  onChange={(e) => setUomForm({ ...uomForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('abbreviation')}</label>
                <input
                  type="text"
                  value={uomForm.abbreviation}
                  onChange={(e) => setUomForm({ ...uomForm, abbreviation: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={uomForm.isDefault}
                  onChange={(e) => setUomForm({ ...uomForm, isDefault: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-700 text-blue-600 focus-visible:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">{t('setAsDefault') || 'Set as default'}</label>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUomModal(false);
                    setUomForm({ name: '', abbreviation: '', isDefault: false });
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving || !uomForm.name}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? t('saving') || 'Saving...' : t('save')}
                </button>
              </div>
            </form>
      </Modal>

      {/* Conversion Modal */}
      <Modal
        isOpen={showConversionModal}
        onClose={() => setShowConversionModal(false)}
        title={`${t('add')} ${t('conversion')}`}
        maxWidth="md"
      >
            <form onSubmit={handleCreateConversion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('from')} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={conversionForm.fromUomId}
                  onChange={(e) => {
                    setConversionForm({ ...conversionForm, fromUomId: e.target.value });
                    if (e.target.value === conversionForm.toUomId) {
                      setConversionForm({ ...conversionForm, fromUomId: e.target.value, toUomId: '' });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
                >
                  <option value="">{t('selectUnit') || 'Select unit'}</option>
                  {uoms.map((uom) => (
                    <option key={uom.id} value={uom.id}>
                      {uom.name} {uom.abbreviation ? `(${uom.abbreviation})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('to')} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={conversionForm.toUomId}
                  onChange={(e) => setConversionForm({ ...conversionForm, toUomId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
                >
                  <option value="">{t('selectUnit') || 'Select unit'}</option>
                  {uoms
                    .filter((uom) => uom.id !== conversionForm.fromUomId)
                    .map((uom) => (
                      <option key={uom.id} value={uom.id}>
                        {uom.name} {uom.abbreviation ? `(${uom.abbreviation})` : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('multiplier') || 'Multiplier'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  required
                  value={conversionForm.multiplier}
                  onChange={(e) => setConversionForm({ ...conversionForm, multiplier: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-transparent"
                />
                {conversionExample && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                    {conversionExample}
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowConversionModal(false);
                    setConversionForm({ fromUomId: '', toUomId: '', multiplier: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving || !conversionForm.fromUomId || !conversionForm.toUomId || !conversionForm.multiplier || conversionForm.fromUomId === conversionForm.toUomId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? t('saving') || 'Saving...' : t('save')}
                </button>
              </div>
            </form>
      </Modal>

      {/* View Conversions Modal */}
      <Modal
        isOpen={showConversionsViewModal}
        onClose={() => {
          setShowConversionsViewModal(false);
          setSelectedUomForConversions(null);
          setUomConversions([]);
        }}
        title={selectedUomForConversions ? `${t('conversions')} - ${selectedUomForConversions.name}` : t('conversions')}
        maxWidth="2xl"
      >
        {loadingConversions ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : uomConversions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">{t('noConversionsYet')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('from')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('factor')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('to')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('explanation') || 'Explanation'}
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('type') || 'Type'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {uomConversions.map((conv, index) => {
                      const fromName = conv.fromUom?.name?.toLowerCase() || 'unit';
                      const toName = conv.toUom?.name?.toLowerCase() || 'unit';
                      const mult = Number(conv.factor);
                      let formattedMult = mult % 1 === 0 ? mult.toString() : mult.toString().replace(/\.?0+$/, '');
                      let explanation = '';
                      
                      if (mult < 1 && mult > 0) {
                        const inverse = 1 / mult;
                        const formattedInverse = inverse % 1 === 0 ? inverse.toString() : inverse.toFixed(6).replace(/\.?0+$/, '');
                        explanation = `1 ${fromName} contains ${formattedInverse} ${toName}${formattedInverse !== '1' ? 's' : ''} (or 1 ${toName} = ${formattedMult} ${fromName})`;
                      } else {
                        explanation = `1 ${fromName} contains ${formattedMult} ${toName}${formattedMult !== '1' ? 's' : ''}`;
                      }
                      
                      return (
                        <tr key={`${conv.fromUom?.id}-${conv.toUom?.id}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {conv.fromUom?.name || 'Unit'}
                              {conv.fromUom?.abbreviation && (
                                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({conv.fromUom.abbreviation})</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formattedMult}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {conv.toUom?.name || 'Unit'}
                              {conv.toUom?.abbreviation && (
                                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({conv.toUom.abbreviation})</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                              {explanation}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              conv.isDirect 
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                            }`}>
                              {conv.isDirect ? (t('direct') || 'Direct') : (t('indirect') || 'Indirect')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
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

