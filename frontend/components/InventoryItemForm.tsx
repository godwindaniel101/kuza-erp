import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';
import SearchableSelect from '@/components/SearchableSelect';
import Modal from '@/components/Modal';

interface InventoryItemFormProps {
  itemId?: string;
  initialData?: any;
  onSuccess?: () => void;
}

export default function InventoryItemForm({ itemId, initialData, onSuccess }: InventoryItemFormProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const isEditMode = !!itemId;
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [uoms, setUoms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [showAddUom, setShowAddUom] = useState(false);
  const [showAddConversion, setShowAddConversion] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '' });
  const [newSubcategory, setNewSubcategory] = useState({ name: '' });
  const [newUom, setNewUom] = useState({ name: '', abbreviation: '' });
  const [newConversion, setNewConversion] = useState({ fromUomId: '', toUomId: '', factor: '' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [convertibleUoms, setConvertibleUoms] = useState<any[]>([]);
  const [selectedUomIds, setSelectedUomIds] = useState<string[]>([]);
  const [loadingConvertible, setLoadingConvertible] = useState(false);
  const [uomMultiSelectOpen, setUomMultiSelectOpen] = useState(false);
  const [uomSearch, setUomSearch] = useState('');
  const [existingConversions, setExistingConversions] = useState<any[]>([]);
  const uomMultiSelectRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    subcategoryId: '',
    baseUomId: '',
    minimumStock: 0,
    maximumStock: 0,
    salePrice: 0,
    barcode: '',
    isTrackable: true,
    frontImage: '',
    additionalImages: [] as string[],
  });
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [frontImageFile, setFrontImageFile] = useState<File | null>(null);
  const [frontImagePreview, setFrontImagePreview] = useState<string>('');
  const [additionalImageFiles, setAdditionalImageFiles] = useState<File[]>([]);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([loadUoms(), loadCategories()]);
    if (isEditMode && initialData) {
      loadItemData();
    }
  }, [isEditMode, initialData]);

  useEffect(() => {
    if (formData.baseUomId) {
      fetchConvertibleUoms(formData.baseUomId);
      if (isEditMode) {
        // Load all conversions when in edit mode (not just those involving base UOM)
        loadExistingConversionsForItem();
      }
    }
  }, [formData.baseUomId, isEditMode]);

  // Load all conversions when conversion modal opens (in edit mode)
  useEffect(() => {
    if (showAddConversion && isEditMode) {
      loadExistingConversionsForItem();
    }
  }, [showAddConversion, isEditMode]);

  const loadItemData = async () => {
    if (!initialData) return;
    const itemData = initialData;
    const baseUomId = itemData.baseUomId || '';
    
    setFormData({
      name: itemData.name || '',
      categoryId: itemData.categoryId || '',
      subcategoryId: itemData.subcategoryId || '',
      baseUomId: baseUomId,
      minimumStock: Number(itemData.minimumStock || 0),
      maximumStock: Number(itemData.maximumStock || 0),
      salePrice: Number(itemData.salePrice || 0),
      barcode: itemData.barcode || '',
      isTrackable: itemData.isTrackable !== false,
      frontImage: itemData.frontImage || '',
      additionalImages: itemData.additionalImages || [],
    });

    if (itemData.frontImage) {
      setFrontImagePreview(itemData.frontImage);
    }
    if (itemData.additionalImages && itemData.additionalImages.length > 0) {
      setAdditionalImagePreviews(itemData.additionalImages);
    }

    if (itemData.categoryId) {
      await loadSubcategories(itemData.categoryId);
    }
    
    // Preload base UOM and conversions for edit mode
    if (baseUomId) {
      await Promise.all([
        fetchConvertibleUoms(baseUomId),
        loadExistingConversionsForItem() // Load all conversions, not just those involving base UOM
      ]);
    }
    
    setLoading(false);
  };

  const loadExistingConversionsForItem = async (baseUomId?: string) => {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>('/ims/uom-conversions');
      if (response.success) {
        // Show all conversions (not just those involving base UOM)
        // since we now allow conversions between any UOMs
        setExistingConversions(response.data || []);
      }
    } catch (err) {
      console.error('Failed to load conversions:', err);
      setExistingConversions([]);
    }
  };

  const fetchConvertibleUoms = async (baseUomId: string) => {
    if (!baseUomId) {
      setConvertibleUoms([]);
      setSelectedUomIds([]);
      return;
    }
    setLoadingConvertible(true);
    try {
      const response = await api.get<{ success: boolean; data: { baseUom: any; convertibleUoms: any[]; allUoms: any[] } }>(
        `/ims/uoms/${baseUomId}/convertible`
      );
      if (response.success) {
        const convertibles = response.data.convertibleUoms || [];
        const baseUomInConvertibles = convertibles.some((u) => u.id === baseUomId);
        if (!baseUomInConvertibles && response.data.baseUom) {
          convertibles.unshift(response.data.baseUom);
        }
        setConvertibleUoms(convertibles);
        setSelectedUomIds((prev) => {
          const baseIncluded = prev.includes(baseUomId);
          if (!baseIncluded) {
            return [baseUomId, ...prev.filter((id) => id !== baseUomId)];
          }
          return [baseUomId, ...prev.filter((id) => id !== baseUomId && convertibles.some((c) => c.id === id))];
        });
      }
    } catch (err) {
      console.error('Failed to load convertible UOMs:', err);
      setConvertibleUoms([]);
      setSelectedUomIds([]);
    } finally {
      setLoadingConvertible(false);
    }
  };

  const loadUoms = async () => {
    try {
      const response = await api.get('/ims/uoms');
      if (response.success) {
        setUoms(response.data);
      }
    } catch (err) {
      console.error('Failed to load UOMs:', err);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/ims/categories');
      if (response.success) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadSubcategories = async (categoryId: string) => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    try {
      const response = await api.get(`/ims/categories/${categoryId}/subcategories`);
      if (response.success) {
        setSubcategories(response.data);
      }
    } catch (err) {
      console.error('Failed to load subcategories:', err);
      setSubcategories([]);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      setToast({ message: t('pleaseFillAllFields') || 'Please fill all fields', type: 'error' });
      return;
    }
    try {
      const res = await api.post('/ims/categories', { name: newCategory.name.trim() });
      if (res.success) {
        await loadCategories();
        setFormData({ ...formData, categoryId: res.data.id });
        setNewCategory({ name: '' });
        setShowAddCategory(false);
        setToast({ message: t('categoryAdded') || 'Category added', type: 'success' });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t('failedToAddCategory') || 'Failed to add category';
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  const handleAddSubcategory = async () => {
    if (!formData.categoryId || !newSubcategory.name.trim()) {
      setToast({ message: t('pleaseFillAllFields') || 'Please fill all fields', type: 'error' });
      return;
    }
    try {
      const res = await api.post(`/ims/categories/${formData.categoryId}/subcategories`, { name: newSubcategory.name.trim() });
      if (res.success) {
        await loadSubcategories(formData.categoryId);
        setFormData({ ...formData, subcategoryId: res.data.id });
        setNewSubcategory({ name: '' });
        setShowAddSubcategory(false);
        setToast({ message: t('subcategoryAdded') || 'Subcategory added', type: 'success' });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t('failedToAddSubcategory') || 'Failed to add subcategory';
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  const handleAddUom = async () => {
    if (!newUom.name.trim()) {
      setToast({ message: t('pleaseFillAllFields') || 'Please fill all fields', type: 'error' });
      return;
    }
    try {
      const payload: { name: string; abbreviation?: string; isDefault: boolean } = {
        name: newUom.name.trim(),
        isDefault: false,
      };
      // Only include abbreviation if it's not empty
      if (newUom.abbreviation && newUom.abbreviation.trim()) {
        payload.abbreviation = newUom.abbreviation.trim();
      }
      const res = await api.post('/ims/uoms', payload);
      if (res.success) {
        await loadUoms();
        if (!isEditMode) {
          setFormData({ ...formData, baseUomId: res.data.id });
          setSelectedUomIds([res.data.id]);
        }
        setNewUom({ name: '', abbreviation: '' });
        setShowAddUom(false);
        setToast({ message: t('uomCreated') || 'UOM created successfully', type: 'success' });
        if (res.data.id && !isEditMode) {
          await fetchConvertibleUoms(res.data.id);
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t('failedToAddUom') || 'Failed to add UOM';
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  const handleAddConversion = async () => {
    if (!newConversion.fromUomId || !newConversion.toUomId || !newConversion.factor) {
      setToast({ message: t('pleaseFillAllFields') || 'Please fill all fields', type: 'error' });
      return;
    }

    // Validate that from and to are different
    if (newConversion.fromUomId === newConversion.toUomId) {
      setToast({ message: t('cannotConvertSameUnit') || 'Cannot convert between the same unit', type: 'error' });
      return;
    }

    // Validate that both UOMs exist in the list
    const fromUom = uoms.find(u => u.id === newConversion.fromUomId);
    const toUom = uoms.find(u => u.id === newConversion.toUomId);
    if (!fromUom || !toUom) {
      setToast({ message: t('invalidUom') || 'Invalid UOM selected', type: 'error' });
      return;
    }

    try {
      const factor = parseFloat(newConversion.factor);
      if (isNaN(factor) || factor <= 0) {
        setToast({ message: t('invalidFactor') || 'Conversion factor must be a positive number', type: 'error' });
        return;
      }

      const res = await api.post('/ims/uom-conversions', {
        fromUomId: newConversion.fromUomId,
        toUomId: newConversion.toUomId,
        factor: factor,
      });

      if (res.success) {
        setToast({ message: t('conversionAdded') || 'Conversion added successfully', type: 'success' });
        setNewConversion({ fromUomId: '', toUomId: '', factor: '' });
        setShowAddConversion(false);
        // Reload conversions and convertible UOMs (if baseUomId exists)
        // Always reload all conversions since we now allow conversions between any UOMs
        await loadExistingConversionsForItem();
        if (formData.baseUomId) {
          await fetchConvertibleUoms(formData.baseUomId);
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t('failedToAddConversion') || 'Failed to add conversion';
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  const compressImage = (file: File, maxWidth: number = 1920, maxHeight: number = 1920, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageSelect = async (file: File, isFrontImage: boolean) => {
    if (!file.type.startsWith('image/')) {
      setToast({ message: t('pleaseSelectImage') || 'Please select an image file', type: 'error' });
      return;
    }

    // Check file size (10MB limit before compression)
    if (file.size > 10 * 1024 * 1024) {
      setToast({ message: t('imageTooLarge') || 'Image is too large. Please select an image smaller than 10MB', type: 'error' });
      return;
    }

    try {
      const base64String = await compressImage(file);
      
      if (isFrontImage) {
        setFrontImagePreview(base64String);
        setFrontImageFile(file);
        setFormData({ ...formData, frontImage: base64String });
      } else {
        setAdditionalImagePreviews((prev) => [...prev, base64String]);
        setAdditionalImageFiles((prev) => [...prev, file]);
        setFormData({ ...formData, additionalImages: [...formData.additionalImages, base64String] });
      }
    } catch (error) {
      console.error('Image compression error:', error);
      setToast({ message: t('failedToProcessImage') || 'Failed to process image. Please try another image.', type: 'error' });
    }
  };

  const removeFrontImage = () => {
    setFrontImagePreview('');
    setFrontImageFile(null);
    setFormData({ ...formData, frontImage: '' });
  };

  const removeAdditionalImage = (index: number) => {
    const newPreviews = additionalImagePreviews.filter((_, i) => i !== index);
    const newFiles = additionalImageFiles.filter((_, i) => i !== index);
    setAdditionalImagePreviews(newPreviews);
    setAdditionalImageFiles(newFiles);
    setFormData({ ...formData, additionalImages: formData.additionalImages.filter((_, i) => i !== index) });
  };

  const toggleUomSelection = (uomId: string) => {
    if (uomId === formData.baseUomId || isEditMode) return;
    setSelectedUomIds((prev) => {
      if (prev.includes(uomId)) {
        return prev.filter((id) => id !== uomId);
      } else {
        return [...prev, uomId];
      }
    });
  };

  const removeUomFromSelection = (uomId: string) => {
    if (uomId === formData.baseUomId || isEditMode) return;
    setSelectedUomIds((prev) => prev.filter((id) => id !== uomId));
  };

  const getFilteredConvertibleUoms = () => {
    if (!uomSearch) return convertibleUoms;
    const searchLower = uomSearch.toLowerCase();
    return convertibleUoms.filter(
      (uom) =>
        uom.name.toLowerCase().includes(searchLower) ||
        (uom.abbreviation && uom.abbreviation.toLowerCase().includes(searchLower))
    );
  };

  const getSelectedUoms = () => {
    return convertibleUoms.filter((uom) => selectedUomIds.includes(uom.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditMode && !formData.baseUomId) {
      setToast({ message: t('pleaseSelectBaseUom') || 'Please select a base UOM first', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const submitData = {
        name: formData.name,
        categoryId: formData.categoryId || undefined,
        subcategoryId: formData.subcategoryId || undefined,
        // unitCost is not set here - cost is captured during inflow
        minimumStock: formData.isTrackable ? formData.minimumStock : 0,
        maximumStock: formData.isTrackable ? formData.maximumStock : 0,
        salePrice: formData.salePrice,
        barcode: formData.barcode || undefined,
        isTrackable: formData.isTrackable,
        frontImage: formData.frontImage || undefined,
        additionalImages: formData.additionalImages.length > 0 ? formData.additionalImages : undefined,
      };

      if (isEditMode) {
        await api.patch(`/ims/inventory/${itemId}`, submitData);
        setToast({ message: t('updatedSuccessfully') || 'Updated successfully', type: 'success' });
      } else {
        submitData.baseUomId = formData.baseUomId;
        submitData.currentStock = 0;
        await api.post('/ims/inventory', submitData);
        setToast({ message: t('createdSuccessfully') || 'Created successfully', type: 'success' });
      }

      if (onSuccess) {
        onSuccess();
      } else {
        setTimeout(() => router.push('/ims/inventory'), 500);
      }
    } catch (err: any) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} inventory item:`, err);
      const errorMessage = err.response?.data?.message || err.message || (isEditMode ? t('updateFailed') : t('createFailed')) || 'Failed to save';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (uomMultiSelectRef.current && !uomMultiSelectRef.current.contains(event.target as Node)) {
        setUomMultiSelectOpen(false);
        setUomSearch('');
      }
    };
    if (uomMultiSelectOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [uomMultiSelectOpen]);

  const currentBaseUom = uoms.find((u) => u.id === formData.baseUomId) || initialData?.baseUom;

  // Calculate conversion example text (similar to settings page)
  // IMPORTANT: This hook must be called before any conditional returns
  const conversionExample = useMemo(() => {
    if (!newConversion.fromUomId || !newConversion.toUomId || !newConversion.factor) {
      return '';
    }
    
    // Find UOMs from the full list (since we allow any UOM to be selected)
    const fromUom = uoms.find(u => u.id === newConversion.fromUomId);
    const toUom = uoms.find(u => u.id === newConversion.toUomId);
    
    if (!fromUom || !toUom) {
      return '';
    }

    // Get the actual name from the UOM object - use name first, then abbreviation
    const fromNameRaw = fromUom.name || fromUom.abbreviation || '';
    const toNameRaw = toUom.name || toUom.abbreviation || '';
    
    if (!fromNameRaw || !toNameRaw) {
      return '';
    }

    const fromName = fromNameRaw.toLowerCase().trim();
    const toName = toNameRaw.toLowerCase().trim();

    const mult = parseFloat(newConversion.factor);
    if (isNaN(mult) || mult <= 0) return '';

    let formattedMult = mult % 1 === 0 ? mult.toString() : mult.toString().replace(/\.?0+$/, '');

    // For multipliers < 1, show the inverse for better clarity
    if (mult < 1 && mult > 0) {
      const inverse = 1 / mult;
      const formattedInverse = inverse % 1 === 0 ? inverse.toString() : inverse.toFixed(6).replace(/\.?0+$/, '');
      return `1 ${fromName} = ${formattedMult} ${toName} (or 1 ${toName} = ${formattedInverse} ${fromName})`;
    }

    return `1 ${fromName} = ${formattedMult} ${toName}`;
  }, [newConversion.fromUomId, newConversion.toUomId, newConversion.factor, uoms]);

  // Handle loading state - must be after all hooks
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              required
            />
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('category')} {!isEditMode && <span className="text-red-500">*</span>}
              </label>
              <button
                type="button"
                onClick={() => setShowAddCategory(true)}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline whitespace-nowrap"
              >
                {t('addCategory')}
              </button>
            </div>
            <SearchableSelect
              options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
              value={formData.categoryId}
              onChange={(value) => {
                setFormData({ ...formData, categoryId: value, subcategoryId: '' });
                if (value) {
                  loadSubcategories(value);
                } else {
                  setSubcategories([]);
                }
              }}
              placeholder={t('selectCategory')}
              required={!isEditMode}
              focusColor="red"
              searchPlaceholder={t('searchCategory') || 'Search category...'}
            />
          </div>

          {/* Subcategory */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('subcategory')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
              </label>
              {formData.categoryId && (
                <button
                  type="button"
                  onClick={() => setShowAddSubcategory(true)}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline whitespace-nowrap"
                >
                  {t('addSubcategory') || 'Add Subcategory'}
                </button>
              )}
            </div>
            <SearchableSelect
              options={subcategories.map((sub) => ({ value: sub.id, label: sub.name }))}
              value={formData.subcategoryId}
              onChange={(value) => setFormData({ ...formData, subcategoryId: value })}
              placeholder={t('selectSubCategory')}
              disabled={!formData.categoryId}
              focusColor="red"
              searchPlaceholder={t('searchSubCategory') || 'Search subcategory...'}
            />
          </div>
        </div>

        {/* UOM Section - 1/3 width grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Base UOM */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('baseUom')} {!isEditMode && <span className="text-red-500">*</span>}
                {isEditMode && <span className="text-gray-400 dark:text-gray-500 text-xs">({t('cannotBeChanged') || 'Cannot be changed'})</span>}
              </label>
              {!isEditMode && (
                <button
                  type="button"
                  onClick={() => setShowAddUom(true)}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline whitespace-nowrap"
                >
                  {t('addUom')}
                </button>
              )}
            </div>
            {isEditMode ? (
              <input
                type="text"
                value={currentBaseUom?.name ? `${currentBaseUom.name}${currentBaseUom.abbreviation ? ` (${currentBaseUom.abbreviation})` : ''}` : 'N/A'}
                disabled
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
              />
            ) : (
              <SearchableSelect
                options={uoms.map((uom) => ({
                  value: uom.id,
                  label: `${uom.name}${uom.abbreviation ? ` (${uom.abbreviation})` : ''}`,
                }))}
                value={formData.baseUomId}
                onChange={(value) => {
                  setFormData({ ...formData, baseUomId: value });
                  setSelectedUomIds(value ? [value] : []);
                }}
                placeholder={t('selectUnit') || 'Select Base UOM'}
                required
                focusColor="red"
                searchPlaceholder={t('searchUom') || 'Search UOM...'}
              />
            )}
            {!isEditMode && (
              <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                <i className="bx bx-info-circle"></i>
                <span>{t('baseUomWarning')}</span>
              </p>
            )}
          </div>

          {/* Allowed Units - Only show for create mode */}
          {!isEditMode && formData.baseUomId && (
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('allowedUnits') || 'Allowed Units'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddConversion(true)}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline whitespace-nowrap"
                >
                  {t('addConversion') || 'Add Conversion'}
                </button>
              </div>

              {loadingConvertible ? (
                <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                  </div>
                </div>
              ) : convertibleUoms.filter((u) => u.id !== formData.baseUomId).length === 0 ? (
                <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <i className="bx bx-info-circle mt-0.5"></i>
                    <span>{t('noConvertibleUnitsShort')}</span>
                  </p>
                </div>
              ) : (
                <div ref={uomMultiSelectRef} className="relative">
                  <div
                    className="min-h-[48px] w-full px-3 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg focus-within:ring-1 focus-within:ring-red-500 focus-within:border-transparent cursor-text"
                    onClick={() => {
                      setUomMultiSelectOpen(true);
                      setTimeout(() => {
                        const searchInput = document.getElementById('uom-search-input') as HTMLInputElement;
                        searchInput?.focus();
                      }, 100);
                    }}
                  >
                    <div className="flex flex-wrap gap-2 items-center">
                      {getSelectedUoms().map((uom) => (
                        <span
                          key={uom.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm font-medium"
                        >
                          <span>
                            {uom.name} {uom.id === formData.baseUomId ? `(${t('base') || 'base'})` : ''}
                          </span>
                          {uom.id !== formData.baseUomId && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeUomFromSelection(uom.id);
                              }}
                              className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200 focus:outline-none"
                            >
                              <i className="bx bx-x text-sm"></i>
                            </button>
                          )}
                        </span>
                      ))}
                      <input
                        id="uom-search-input"
                        type="text"
                        value={uomSearch}
                        onChange={(e) => setUomSearch(e.target.value)}
                        onFocus={() => setUomMultiSelectOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setUomMultiSelectOpen(false);
                            setUomSearch('');
                          }
                        }}
                        placeholder={t('selectUnits') || 'Select units...'}
                        className="flex-1 min-w-[120px] outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                      />
                    </div>
                  </div>

                  {uomMultiSelectOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {getFilteredConvertibleUoms().length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                          {t('noUnitsFound') || 'No units found'}
                        </div>
                      ) : (
                        getFilteredConvertibleUoms().map((uom) => (
                          <button
                            key={uom.id}
                            type="button"
                            onClick={() => {
                              toggleUomSelection(uom.id);
                              setUomSearch('');
                            }}
                            disabled={uom.id === formData.baseUomId}
                            className={`
                              w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors
                              ${
                                selectedUomIds.includes(uom.id)
                                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                  : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }
                              ${uom.id === formData.baseUomId ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                          >
                            <span>
                              {uom.name} {uom.id === formData.baseUomId ? `(${t('base') || 'base'})` : ''}
                            </span>
                            {selectedUomIds.includes(uom.id) && (
                              <i className="bx bx-check text-red-600 dark:text-red-400"></i>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Add Conversion - Edit Mode */}
          {isEditMode && formData.baseUomId && (
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('existingConversions') || 'Existing Conversions'} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('cannotBeRemoved') || 'Cannot be removed'})</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddConversion(true)}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline whitespace-nowrap"
                >
                  {t('addConversion') || 'Add Conversion'}
                </button>
              </div>
              {loadingConvertible ? (
                <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                  </div>
                </div>
              ) : existingConversions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {existingConversions.map((conv: any, index: number) => {
                    const fromUom = conv.fromUom || uoms.find((u: any) => u.id === conv.fromUomId);
                    const toUom = conv.toUom || uoms.find((u: any) => u.id === conv.toUomId);
                    const fromName = fromUom?.name || fromUom?.abbreviation || conv.fromUomId || 'N/A';
                    const toName = toUom?.name || toUom?.abbreviation || conv.toUomId || 'N/A';
                    const factor = Number(conv.factor || 0);
                    const isBaseInvolved = formData.baseUomId && (conv.fromUomId === formData.baseUomId || conv.toUomId === formData.baseUomId);
                    
                    return (
                      <div key={index} className={`px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg ${isBaseInvolved ? 'bg-gray-50 dark:bg-gray-700' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          <span className="font-medium">{fromName}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium">{toName}</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                          <span>{t('factor') || 'Factor'}: {factor % 1 === 0 ? factor.toString() : factor.toFixed(6).replace(/\.?0+$/, '')}</span>
                          {isBaseInvolved && (
                            <span className="text-xs text-blue-600 dark:text-blue-400">({t('baseUnit') || 'Base Unit'})</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-3 border border-gray-300 dark:border-gray-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <i className="bx bx-info-circle mt-0.5"></i>
                    <span>{t('noConvertibleUnitsShort') || 'No conversions yet. Click "Add Conversion" to add one.'}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pricing, Stock, and Trackable */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sale Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('salesPrice')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.salePrice}
              onChange={(e) => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })}
              onFocus={(e) => {
                if (e.target.value === '0' || e.target.value === '0.00') {
                  e.target.value = '';
                }
              }}
              className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              required
            />
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('barcode')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
            </label>
            <input
              type="text"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
            />
          </div>

          {/* Trackable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('isTrackable')}
            </label>
            <div className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg flex items-center">
              <input
                type="checkbox"
                checked={formData.isTrackable}
                onChange={(e) => {
                  const isTrackable = e.target.checked;
                  setFormData({
                    ...formData,
                    isTrackable,
                    minimumStock: isTrackable ? formData.minimumStock : 0,
                    maximumStock: isTrackable ? formData.maximumStock : 0,
                  });
                }}
                className="h-4 w-4 text-red-600 focus-visible:ring-red-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
              />
              <label 
                className="ml-2 block text-sm text-gray-900 dark:text-gray-300 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  const checkbox = e.currentTarget.previousElementSibling as HTMLInputElement;
                  if (checkbox) {
                    checkbox.click();
                  }
                }}
              >
                {formData.isTrackable ? t('yes') : t('no')}
              </label>
            </div>
          </div>
        </div>

        {/* Minimum and Maximum Stock - Only show if trackable */}
        {formData.isTrackable && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('minimumStock')}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.minimumStock}
                onChange={(e) => setFormData({ ...formData, minimumStock: parseFloat(e.target.value) || 0 })}
                onFocus={(e) => {
                  if (e.target.value === '0' || e.target.value === '0.00') {
                    e.target.value = '';
                  }
                }}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('maximumStock')}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.maximumStock}
                onChange={(e) => setFormData({ ...formData, maximumStock: parseFloat(e.target.value) || 0 })}
                onFocus={(e) => {
                  if (e.target.value === '0' || e.target.value === '0.00') {
                    e.target.value = '';
                  }
                }}
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              />
            </div>
            <div></div>
          </div>
        )}

        {/* Images */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('images')}</label>
            <button
              type="button"
              onClick={() => setShowImageUpload(true)}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
            >
              {t('uploadImages') || 'Upload Images'}
            </button>
          </div>

          {/* Images Section - Front Image (1/6) + Additional Images (5/6) */}
          {(frontImagePreview || additionalImagePreviews.length > 0) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('images')}</label>
              <div className="flex gap-4">
                {/* Front Image - 1/6 width, bordered and rounded */}
                {frontImagePreview && (
                  <div className="w-1/6">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('frontImage')}</label>
                    <div className="relative">
                      <img
                        src={frontImagePreview}
                        alt="Front"
                        className="w-full aspect-square object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={removeFrontImage}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                      >
                        <i className="bx bx-x text-lg"></i>
                      </button>
                    </div>
                  </div>
                )}

                {/* Additional Images - 5/6 width, all wrapped in one border */}
                {additionalImagePreviews.length > 0 && (
                  <div className={`${frontImagePreview ? 'flex-1 w-5/6' : 'w-full'}`}>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('additionalImages')}</label>
                    <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4">
                      <div className="grid grid-cols-5 gap-2">
                        {additionalImagePreviews.map((preview, index) => (
                          <div key={index} className="relative aspect-square">
                            <img
                              src={preview}
                              alt={`Additional ${index + 1}`}
                              className="w-full h-full object-cover rounded"
                            />
                            <button
                              type="button"
                              onClick={() => removeAdditionalImage(index)}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                            >
                              <i className="bx bx-x text-xs"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push('/ims/inventory')}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
          >
            {saving ? t('saving') || 'Saving...' : isEditMode ? t('save') || 'Save' : t('create') || 'Create'}
          </button>
        </div>
      </form>

      {/* Add Category Modal */}
      <Modal isOpen={showAddCategory} onClose={() => setShowAddCategory(false)} title={t('addCategory') || 'Add Category'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('categoryName')}</label>
            <input
              type="text"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ name: e.target.value })}
              className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              placeholder={t('categoryName')}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowAddCategory(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              {t('cancel')}
            </button>
            <button type="button" onClick={handleAddCategory} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              {t('add')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Subcategory Modal */}
      <Modal isOpen={showAddSubcategory} onClose={() => setShowAddSubcategory(false)} title={t('addSubcategory') || 'Add Subcategory'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('subcategoryName')}</label>
            <input
              type="text"
              value={newSubcategory.name}
              onChange={(e) => setNewSubcategory({ name: e.target.value })}
              className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              placeholder={t('subcategoryName')}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowAddSubcategory(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              {t('cancel')}
            </button>
            <button type="button" onClick={handleAddSubcategory} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              {t('add')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add UOM Modal */}
      <Modal isOpen={showAddUom} onClose={() => setShowAddUom(false)} title={t('addUom') || 'Add UOM'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newUom.name}
              onChange={(e) => setNewUom({ ...newUom, name: e.target.value })}
              className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              placeholder={t('name')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('abbreviation')}</label>
            <input
              type="text"
              value={newUom.abbreviation}
              onChange={(e) => setNewUom({ ...newUom, abbreviation: e.target.value })}
              className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              placeholder={t('abbreviation')}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowAddUom(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              {t('cancel')}
            </button>
            <button type="button" onClick={handleAddUom} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              {t('add')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Conversion Modal */}
      <Modal isOpen={showAddConversion} onClose={() => {
        setShowAddConversion(false);
        setNewConversion({ fromUomId: '', toUomId: '', factor: '' });
      }} title={t('addConversion') || 'Add Conversion'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('from') || 'From'} <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={uoms.map((uom) => ({
                value: uom.id,
                label: `${uom.name}${uom.abbreviation ? ` (${uom.abbreviation})` : ''}${uom.id === formData.baseUomId ? ' (Base)' : ''}`,
              }))}
              value={newConversion.fromUomId}
              onChange={(value) => {
                setNewConversion({ ...newConversion, fromUomId: value, toUomId: value === newConversion.toUomId ? '' : newConversion.toUomId });
              }}
              placeholder={t('selectUnit') || 'Select Unit'}
              focusColor="red"
              searchPlaceholder={t('searchUom') || 'Search UOM...'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('to') || 'To'} <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={uoms
                .filter((u) => u.id !== newConversion.fromUomId)
                .map((uom) => ({
                  value: uom.id,
                  label: `${uom.name}${uom.abbreviation ? ` (${uom.abbreviation})` : ''}${uom.id === formData.baseUomId ? ' (Base)' : ''}`,
                }))}
              value={newConversion.toUomId}
              onChange={(value) => setNewConversion({ ...newConversion, toUomId: value })}
              placeholder={t('selectUnit') || 'Select Unit'}
              focusColor="red"
              searchPlaceholder={t('searchUom') || 'Search UOM...'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('factor') || 'Factor'} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.000001"
              min="0.000001"
              value={newConversion.factor}
              onChange={(e) => setNewConversion({ ...newConversion, factor: e.target.value })}
              placeholder="e.g., 0.5, 2, 10"
              className="w-full min-h-[48px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-transparent"
              required
            />
            {conversionExample && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                {conversionExample}
              </p>
            )}
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowAddConversion(false);
                setNewConversion({ fromUomId: '', toUomId: '', factor: '' });
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
            >
              {t('cancel')}
            </button>
            <button 
              type="button" 
              onClick={handleAddConversion}
              disabled={!newConversion.fromUomId || !newConversion.toUomId || !newConversion.factor || newConversion.fromUomId === newConversion.toUomId}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('add')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Image Upload Modal */}
      <Modal isOpen={showImageUpload} onClose={() => setShowImageUpload(false)} title={t('uploadImages') || 'Upload Images'}>
        <div className="space-y-6">
          {/* Front Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('frontImage')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
            </label>
            {frontImagePreview ? (
              <div className="relative inline-block">
                <img
                  src={frontImagePreview}
                  alt="Front"
                  className="w-48 h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={removeFrontImage}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                >
                  <i className="bx bx-x text-lg"></i>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <i className="bx bx-cloud-upload text-3xl text-gray-400 dark:text-gray-500 mb-2"></i>
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">{t('clickToUpload') || 'Click to upload'}</span> {t('or') || 'or'} {t('dragAndDrop') || 'drag and drop'}
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageSelect(file, true);
                  }}
                />
              </label>
            )}
          </div>

          {/* Additional Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('additionalImages')} <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {additionalImagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Additional ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => removeAdditionalImage(index)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                  >
                    <i className="bx bx-x text-sm"></i>
                  </button>
                </div>
              ))}
            </div>
            {additionalImagePreviews.length < 10 && (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <i className="bx bx-plus text-3xl text-gray-400 dark:text-gray-500 mb-2"></i>
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">{t('addMoreImages') || 'Add more images'}</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach((file) => handleImageSelect(file, false));
                  }}
                />
              </label>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowImageUpload(false)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              {t('done')}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
