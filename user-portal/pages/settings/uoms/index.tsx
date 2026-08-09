import { useState, useEffect, useMemo } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import PermissionGuard from '@/components/PermissionGuard';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
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
    <div className="p-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <PageHeader
        title={t('uoms')}
        subtitle={t('settings.uomsSubtitle', 'The units your stock is counted in')}
        breadcrumbs={[{ label: t('settings') || 'Settings', href: '/settings' }, { label: t('uoms') }]}
      />

      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('uoms')}
            className={`py-2 px-4 border-b-2 transition-colors ${
              activeTab === 'uoms'
                ? 'border-brand-600 dark:border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('uoms')} ({uoms.length})
          </button>
          <button
            onClick={() => setActiveTab('conversions')}
            className={`py-2 px-4 border-b-2 transition-colors ${
              activeTab === 'conversions'
                ? 'border-brand-600 dark:border-brand-500 text-brand-600 dark:text-brand-400'
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
              <Button variant="primary" onClick={() => setShowUomModal(true)}>
                {t('add')} {t('uom')}
              </Button>
            </PermissionGuard>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
            </div>
          ) : uoms.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                <i className="bx bx-ruler text-gray-400 dark:text-gray-500 text-2xl"></i>
              </div>
              <h3 className="text-gray-900 dark:text-gray-100 font-medium">{t('noUomsYet') || 'No units of measure yet'}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('addYourFirstUom') || 'Add your first unit of measure to get started'}</p>
              <PermissionGuard permission="uoms.create">
                <Button variant="primary" className="mt-4" onClick={() => setShowUomModal(true)}>
                  {t('add')} {t('uom')}
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('name')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('abbreviation')}
                      </th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('default')}
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('actions') || 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                    {uoms.map((uom) => (
                      <tr key={uom.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{uom.name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-500 dark:text-gray-400">{uom.abbreviation || '-'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {uom.isDefault && (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                              {t('default')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
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
              <Button variant="primary" onClick={() => setShowConversionModal(true)}>
                {t('add')} {t('conversion')}
              </Button>
            </PermissionGuard>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
            </div>
          ) : conversions.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                <i className="bx bx-transfer text-gray-400 dark:text-gray-500 text-2xl"></i>
              </div>
              <h3 className="text-gray-900 dark:text-gray-100 font-medium">{t('noConversionsYet')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('addYourFirstConversion')}</p>
              <PermissionGuard permission="uoms.create">
                <Button variant="primary" className="mt-4" onClick={() => setShowConversionModal(true)}>
                  {t('add')} {t('conversion')}
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('from')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('factor')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('to')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('explanation') || 'Explanation'}
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('actions') || 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
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
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {conv.fromUom?.name || 'Unit'}
                              {conv.fromUom?.abbreviation && (
                                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({conv.fromUom.abbreviation})</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formattedMult}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {conv.toUom?.name || 'Unit'}
                              {conv.toUom?.abbreviation && (
                                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({conv.toUom.abbreviation})</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                              {explanation}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
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
              <FormField
                type="text"
                name="uomName"
                label={t('name')}
                required
                value={uomForm.name}
                onChange={(value) => setUomForm({ ...uomForm, name: value })}
              />
              <FormField
                type="text"
                name="uomAbbreviation"
                label={t('abbreviation')}
                value={uomForm.abbreviation}
                onChange={(value) => setUomForm({ ...uomForm, abbreviation: value })}
              />
              <FormField
                type="checkbox"
                name="uomIsDefault"
                checked={uomForm.isDefault}
                onChange={(checked) => setUomForm({ ...uomForm, isDefault: checked })}
                checkboxLabel={t('setAsDefault') || 'Set as default'}
              />
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowUomModal(false);
                    setUomForm({ name: '', abbreviation: '', isDefault: false });
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" variant="primary" disabled={saving || !uomForm.name}>
                  {saving ? t('saving') || 'Saving...' : t('save')}
                </Button>
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
              <FormField
                type="select"
                name="fromUomId"
                label={t('from')}
                required
                value={conversionForm.fromUomId}
                onChange={(value) => {
                  setConversionForm({ ...conversionForm, fromUomId: value });
                  if (value === conversionForm.toUomId) {
                    setConversionForm({ ...conversionForm, fromUomId: value, toUomId: '' });
                  }
                }}
                placeholder={t('selectUnit') || 'Select unit'}
                options={uoms.map((uom) => ({
                  value: uom.id,
                  label: `${uom.name} ${uom.abbreviation ? `(${uom.abbreviation})` : ''}`,
                }))}
              />
              <FormField
                type="select"
                name="toUomId"
                label={t('to')}
                required
                value={conversionForm.toUomId}
                onChange={(value) => setConversionForm({ ...conversionForm, toUomId: value })}
                placeholder={t('selectUnit') || 'Select unit'}
                options={uoms
                  .filter((uom) => uom.id !== conversionForm.fromUomId)
                  .map((uom) => ({
                    value: uom.id,
                    label: `${uom.name} ${uom.abbreviation ? `(${uom.abbreviation})` : ''}`,
                  }))}
              />
              <div>
                <FormField
                  type="number"
                  name="multiplier"
                  label={t('multiplier') || 'Multiplier'}
                  required
                  step={0.000001}
                  min={0.000001}
                  value={conversionForm.multiplier}
                  onChange={(value) => setConversionForm({ ...conversionForm, multiplier: value })}
                />
                {conversionExample && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                    {conversionExample}
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowConversionModal(false);
                    setConversionForm({ fromUomId: '', toUomId: '', multiplier: '' });
                  }}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving || !conversionForm.fromUomId || !conversionForm.toUomId || !conversionForm.multiplier || conversionForm.fromUomId === conversionForm.toUomId}
                >
                  {saving ? t('saving') || 'Saving...' : t('save')}
                </Button>
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
          </div>
        ) : uomConversions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">{t('noConversionsYet')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card ring-1 ring-gray-950/[0.04] dark:ring-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('from')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('factor')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('to')}
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('explanation') || 'Explanation'}
                      </th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                        {t('type') || 'Type'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
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
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {conv.fromUom?.name || 'Unit'}
                              {conv.fromUom?.abbreviation && (
                                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({conv.fromUom.abbreviation})</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formattedMult}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {conv.toUom?.name || 'Unit'}
                              {conv.toUom?.abbreviation && (
                                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({conv.toUom.abbreviation})</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                              {explanation}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
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

