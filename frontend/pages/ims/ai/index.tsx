import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';

export default function AiAnalyticsPage() {
  const { t } = useTranslation('common');
  const [health, setHealth] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [prediction, setPrediction] = useState<any>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [healthLoading, setHealthLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [predictionLoading, setPredictionLoading] = useState(false);

  useEffect(() => {
    loadHealth();
    loadSuggestions();
    loadInventoryItems();
  }, []);

  const loadHealth = async () => {
    setHealthLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: any }>('/ims/ai/inventory-health');
      if (response.success) {
        setHealth(response.data);
      }
    } catch (err) {
      console.error('Failed to load health:', err);
    } finally {
      setHealthLoading(false);
    }
  };

  const loadSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/ims/ai/reorder-suggestions');
      if (response.success) {
        setSuggestions(response.data);
      }
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const loadPrediction = async () => {
    if (!selectedItemId) return;
    setPredictionLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: any }>(
        `/ims/ai/predict-demand/${selectedItemId}`,
      );
      if (response.success) {
        setPrediction(response.data);
      }
    } catch (err) {
      console.error('Failed to load prediction:', err);
    } finally {
      setPredictionLoading(false);
    }
  };

  const loadInventoryItems = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/ims/inventory');
      if (response.success) {
        setInventoryItems(response.data);
      }
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  };

  const getPriorityClass = (priority: string) => {
    const classes: Record<string, string> = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };
    return classes[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('aiAnalytics')}</h1>

      {/* Inventory Health */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('inventoryHealth')}</h2>
        {healthLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : health ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{health.healthScore.toFixed(0)}</p>
              <p className="text-sm text-gray-500">{t('healthScore')}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{health.lowStockCount}</p>
              <p className="text-sm text-gray-500">{t('lowStockItems')}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{health.overstockCount}</p>
              <p className="text-sm text-gray-500">{t('overstockItems')}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">${health.totalInventoryValue.toFixed(2)}</p>
              <p className="text-sm text-gray-500">{t('totalValue')}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Reorder Suggestions */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{t('reorderSuggestions')}</h2>
          <button
            onClick={loadSuggestions}
            className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 flex items-center space-x-2 shadow-sm text-sm"
          >
            {t('refresh')}
          </button>
        </div>
        {suggestionsLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">{t('noSuggestions')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('item')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('currentStock')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('daysUntilStockout')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('recommendedQty')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('priority')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suggestions.map((suggestion) => (
                  <tr key={suggestion.itemId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {suggestion.itemName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {suggestion.currentStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {suggestion.daysUntilStockout} {t('days')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {suggestion.recommendedQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityClass(suggestion.priority)}`}>
                        {suggestion.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Demand Prediction */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">{t('demandPrediction')}</h2>
        <div className="mb-4">
          <select
            value={selectedItemId}
            onChange={(e) => {
              setSelectedItemId(e.target.value);
              if (e.target.value) {
                setTimeout(() => loadPrediction(), 100);
              }
            }}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="">{t('selectItem')}</option>
            {inventoryItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        {predictionLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : prediction ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{prediction.predictedDemand.toFixed(0)}</p>
              <p className="text-sm text-gray-600">{t('predictedDemand30Days')}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{prediction.daysUntilStockout}</p>
              <p className="text-sm text-gray-600">{t('daysUntilStockout')}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {prediction.averageDailyConsumption.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">{t('avgDailyConsumption')}</p>
            </div>
          </div>
        ) : null}
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

