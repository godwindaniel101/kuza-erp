import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import { uploadImage } from '@/lib/uploadImage';
import { resolveImageUrl, formatMoney, useCurrency } from '@/lib/format';
import Toast from '@/components/Toast';
import SearchableSelect from '@/components/SearchableSelect';
import Modal from '@/components/Modal';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';

interface InventoryItemFormProps {
  itemId?: string;
  initialData?: any;
  onSuccess?: () => void;
}

export default function InventoryItemForm({ itemId, initialData, onSuccess }: InventoryItemFormProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  // Re-used under /rms/items (Restaurant → Items): navigate back within the same
  // base so the workspace doesn't switch. API calls stay /ims/inventory.
  const base = router.pathname.startsWith('/rms/items') ? '/rms/items' : '/ims/inventory';
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
    binLocation: '',
    isTrackable: true,
    sellAtPos: true,
    unitCost: 0,
    frontImage: '',
    additionalImages: [] as string[],
  });

  // Make-up (bill of materials): items this item is assembled from. When present,
  // selling this item deplete the ingredients instead of its own stock.
  const [components, setComponents] = useState<
    { componentItemId: string; quantity: number; uomId: string }[]
  >([]);
  const [ingredientOptions, setIngredientOptions] = useState<any[]>([]);
  const currency = useCurrency();

  const optionsById = useMemo(
    () => new Map(ingredientOptions.map((o) => [o.id, o])),
    [ingredientOptions],
  );
  const ingredientSelectOptions = useMemo(
    () => ingredientOptions.map((o) => ({ value: o.id, label: o.name })),
    [ingredientOptions],
  );
  const componentCost = (c: { componentItemId: string; quantity: number; uomId: string }) => {
    const opt = optionsById.get(c.componentItemId);
    if (!opt) return 0;
    const uom =
      opt.uoms.find((u: any) => u.id === c.uomId) ||
      opt.uoms.find((u: any) => u.id === opt.baseUomId);
    const factor = uom?.factorToBase ?? 1;
    return (Number(c.quantity) || 0) * factor * (opt.costPerBaseUnit || 0);
  };
  const hasMakeUp = components.length > 0;
  const foodCost = useMemo(
    () => components.reduce((sum, c) => sum + componentCost(c), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [components, optionsById],
  );
  const effectiveCost = hasMakeUp ? foodCost : Number(formData.unitCost) || 0;
  const profit = Number(formData.salePrice) - effectiveCost;
  const marginPct = Number(formData.salePrice) > 0 ? (profit / Number(formData.salePrice)) * 100 : 0;

  const addComponent = () =>
    setComponents((p) => [...p, { componentItemId: '', quantity: 1, uomId: '' }]);
  const removeComponent = (idx: number) =>
    setComponents((p) => p.filter((_, i) => i !== idx));
  const updateComponent = (
    idx: number,
    patch: Partial<{ componentItemId: string; quantity: number; uomId: string }>,
  ) => setComponents((p) => p.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  const chooseComponent = (idx: number, itemId: string) => {
    const opt = optionsById.get(itemId);
    updateComponent(idx, { componentItemId: itemId, uomId: opt?.baseUomId || '' });
  };
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [frontImageFile, setFrontImageFile] = useState<File | null>(null);
  const [frontImagePreview, setFrontImagePreview] = useState<string>('');
  const [additionalImageFiles, setAdditionalImageFiles] = useState<File[]>([]);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  // True while an image is being uploaded to object storage. The Save button is
  // disabled during an upload so an item can't be saved with a half-uploaded image.
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingAdditional, setUploadingAdditional] = useState(0);
  const isUploadingImage = uploadingFront || uploadingAdditional > 0;

  useEffect(() => {
    Promise.all([loadUoms(), loadCategories()]);
    if (isEditMode && initialData) {
      loadItemData();
    }
  }, [isEditMode, initialData]);

  // Ingredient options (raw items + UoMs + cost per base unit) for the make-up.
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ success: boolean; data: any[] }>(
          '/ims/inventory/ingredient-options',
        );
        if (res.success && Array.isArray(res.data)) setIngredientOptions(res.data);
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

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
      binLocation: itemData.binLocation || '',
      isTrackable: itemData.isTrackable !== false,
      sellAtPos: itemData.sellAtPos !== false,
      unitCost: Number(itemData.unitCost || 0),
      frontImage: itemData.frontImage || '',
      additionalImages: itemData.additionalImages || [],
    });
    if (Array.isArray(itemData.components)) {
      setComponents(
        itemData.components.map((c: any) => ({
          componentItemId: c.componentItemId,
          quantity: Number(c.quantity) || 0,
          uomId: c.uomId || '',
        })),
      );
    }

    if (itemData.frontImage) {
      // Stored /uploads paths are served by the API origin, not the frontend.
      setFrontImagePreview(resolveImageUrl(itemData.frontImage));
    }
    if (itemData.additionalImages && itemData.additionalImages.length > 0) {
      setAdditionalImagePreviews(itemData.additionalImages.map((u: string) => resolveImageUrl(u)));
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

  const handleImageSelect = async (file: File, isFrontImage: boolean) => {
    if (!file.type.startsWith('image/')) {
      setToast({ message: t('pleaseSelectImage') || 'Please select an image file', type: 'error' });
      return;
    }

    // 5MB limit — matches the backend upload guard. The server compresses.
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: t('imageTooLarge') || 'Image is too large. Please select an image smaller than 5MB', type: 'error' });
      return;
    }

    // Instant local preview while the file uploads. The DB only ever stores the
    // URL returned by the server, never this blob URL or any base64.
    const previewUrl = URL.createObjectURL(file);

    if (isFrontImage) {
      setFrontImagePreview(previewUrl);
      setFrontImageFile(file);
      setUploadingFront(true);
      try {
        const url = await uploadImage(file);
        setFormData((prev) => ({ ...prev, frontImage: url }));
      } catch (error) {
        console.error('Image upload error:', error);
        setToast({ message: t('failedToProcessImage') || 'Failed to upload image. Please try another image.', type: 'error' });
        setFrontImagePreview('');
        setFrontImageFile(null);
      } finally {
        setUploadingFront(false);
        URL.revokeObjectURL(previewUrl);
      }
    } else {
      setAdditionalImagePreviews((prev) => [...prev, previewUrl]);
      setAdditionalImageFiles((prev) => [...prev, file]);
      setUploadingAdditional((n) => n + 1);
      try {
        const url = await uploadImage(file);
        setFormData((prev) => ({ ...prev, additionalImages: [...prev.additionalImages, url] }));
      } catch (error) {
        console.error('Image upload error:', error);
        setToast({ message: t('failedToProcessImage') || 'Failed to upload image. Please try another image.', type: 'error' });
        setAdditionalImagePreviews((prev) => prev.filter((p) => p !== previewUrl));
        setAdditionalImageFiles((prev) => prev.filter((f) => f !== file));
      } finally {
        setUploadingAdditional((n) => Math.max(0, n - 1));
        URL.revokeObjectURL(previewUrl);
      }
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
      const submitData: any = {
        name: formData.name,
        categoryId: formData.categoryId || undefined,
        subcategoryId: formData.subcategoryId || undefined,
        // unitCost is not set here - cost is captured during inflow
        minimumStock: formData.isTrackable ? formData.minimumStock : 0,
        maximumStock: formData.isTrackable ? formData.maximumStock : 0,
        salePrice: formData.salePrice,
        barcode: formData.barcode || undefined,
        // Warehouse row-rack-bin location; backend column lands in parallel and
        // simply ignores the field until then.
        binLocation: formData.binLocation.trim() || undefined,
        isTrackable: formData.isTrackable,
        sellAtPos: formData.sellAtPos,
        // Manual cost price — used for margin and as COGS for untracked items.
        unitCost: Number(formData.unitCost) || 0,
        // Make-up (recipe). Empty array clears it on edit.
        components: components
          .filter((c) => c.componentItemId)
          .map((c) => ({
            componentItemId: c.componentItemId,
            quantity: Number(c.quantity) || 0,
            uomId: c.uomId || undefined,
          })),
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
        setTimeout(() => router.push(base), 500);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: main form card */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 p-6 space-y-4">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
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
                {t('subcategory')}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md bg-gray-100 dark:bg-gray-700 cursor-not-allowed text-[13px]"
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
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600"></div>
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
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-popover max-h-60 overflow-auto">
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
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600"></div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
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
              className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
            />
          </div>

          {/* Location (row-rack-bin) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location (row-rack-bin) <span className="text-gray-400 dark:text-gray-500 text-xs">({t('optional')})</span>
            </label>
            <input
              type="text"
              value={formData.binLocation}
              onChange={(e) => setFormData({ ...formData, binLocation: e.target.value })}
              placeholder="e.g. A-03-2"
              className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
            />
          </div>

          {/* Trackable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('isTrackable')}
            </label>
            <div className="w-full min-h-[36px] px-3 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg flex items-center">
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
                className="h-4 w-4 text-red-600 focus-visible:ring-brand-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
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

          {/* Sell at POS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sell at POS
            </label>
            <div className="w-full min-h-[36px] px-3 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg flex items-center">
              <input
                type="checkbox"
                checked={formData.sellAtPos}
                onChange={(e) => setFormData({ ...formData, sellAtPos: e.target.checked })}
                className="h-4 w-4 text-brand-600 focus-visible:ring-brand-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                {formData.sellAtPos ? 'Sold to customers' : 'Ingredient only (hidden from POS)'}
              </span>
            </div>
          </div>

          {/* Cost price (manual / auto from make-up) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cost price {hasMakeUp && <span className="text-gray-400 text-xs">(from make-up)</span>}
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={hasMakeUp ? Number(foodCost.toFixed(2)) : formData.unitCost}
              onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
              disabled={hasMakeUp}
              className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px] disabled:opacity-60"
            />
          </div>
        </div>

        {/* Make-up (bill of materials) */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Make-up (recipe)</h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                If this item is assembled from others, list them here. Selling it deducts these ingredients instead of its own stock.
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {components.length > 0 && (
              <div className="flex items-center gap-3 px-1 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                <span className="min-w-0 flex-1">Ingredient</span>
                <span className="w-24 shrink-0">Qty</span>
                <span className="w-28 shrink-0">Unit</span>
                <span className="w-24 shrink-0 text-right">Cost</span>
                <span className="w-9 shrink-0" />
              </div>
            )}
            {components.map((c, idx) => {
              const opt = optionsById.get(c.componentItemId);
              const uoms = opt?.uoms ?? [];
              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <SearchableSelect
                      options={ingredientSelectOptions}
                      value={c.componentItemId}
                      onChange={(v) => chooseComponent(idx, v)}
                      placeholder="Select ingredient…"
                      searchPlaceholder="Search items…"
                    />
                  </div>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={c.quantity}
                    onChange={(e) => updateComponent(idx, { quantity: Number(e.target.value) })}
                    className="h-9 w-24 shrink-0 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 text-[13px] focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
                    aria-label="Quantity"
                  />
                  <select
                    value={c.uomId}
                    onChange={(e) => updateComponent(idx, { uomId: e.target.value })}
                    disabled={!opt}
                    className="h-9 w-28 shrink-0 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 text-[13px] focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 disabled:opacity-50"
                    aria-label="Unit"
                  >
                    {uoms.length === 0 && <option value="">unit</option>}
                    {uoms.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.abbreviation || u.name}</option>
                    ))}
                  </select>
                  <span className="w-24 shrink-0 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {opt ? formatMoney(componentCost(c), currency) : '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeComponent(idx)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    aria-label="Remove"
                  >
                    <i className="bx bx-trash text-lg"></i>
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={addComponent}
              className="mt-1 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              <i className="bx bx-plus"></i> Add ingredient
            </button>
          </div>

          {/* Live economics */}
          {(hasMakeUp || Number(formData.salePrice) > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Cost <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{formatMoney(effectiveCost, currency)}</span>
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Price <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{formatMoney(Number(formData.salePrice) || 0, currency)}</span>
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Profit <span className={`font-medium tabular-nums ${profit < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatMoney(profit, currency)}</span>
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Margin <span className={`font-semibold tabular-nums ${marginPct < 0 ? 'text-red-600 dark:text-red-400' : marginPct < 40 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{Number(formData.salePrice) > 0 ? `${marginPct.toFixed(0)}%` : '—'}</span>
              </span>
            </div>
          )}
        </div>

        {/* Minimum and Maximum Stock - Only show if trackable and not a make-up item */}
        {formData.isTrackable && !hasMakeUp && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
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
                className="h-9 w-full px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-transparent text-[13px]"
              />
            </div>
            <div></div>
          </div>
        )}

          </div>

          {/* RIGHT: product images card */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 p-6 space-y-5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <i className="bx bx-image text-lg"></i>
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('productImages') || 'Product images'}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('productImagesHelp') || 'Add a front image and extra shots'}</p>
                </div>
              </div>

              {/* Front image */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('frontImage')} <span className="text-gray-400 dark:text-gray-500">({t('optional')})</span>
                </label>
                {frontImagePreview ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={frontImagePreview}
                      alt="Front"
                      className="w-full aspect-square object-cover rounded-xl ring-1 ring-gray-200 dark:ring-gray-700"
                    />
                    <button
                      type="button"
                      onClick={removeFrontImage}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 shadow-sm hover:bg-red-700"
                      aria-label={t('remove') || 'Remove'}
                    >
                      <i className="bx bx-x text-lg"></i>
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-800/60 hover:bg-brand-50/40 hover:border-brand-300 dark:hover:bg-gray-800 transition-colors">
                    <i className="bx bx-cloud-upload text-4xl text-gray-400 dark:text-gray-500 mb-2"></i>
                    <p className="px-4 text-center text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-semibold text-brand-600 dark:text-brand-400">{t('clickToUpload') || 'Click to upload'}</span> {t('or') || 'or'} {t('dragAndDrop') || 'drag and drop'}
                    </p>
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

              {/* Additional images */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('additionalImages')} <span className="text-gray-400 dark:text-gray-500">({t('optional')})</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {additionalImagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt={`Additional ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg ring-1 ring-gray-200 dark:ring-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => removeAdditionalImage(index)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 shadow-sm hover:bg-red-700"
                        aria-label={t('remove') || 'Remove'}
                      >
                        <i className="bx bx-x text-xs"></i>
                      </button>
                    </div>
                  ))}
                  {additionalImagePreviews.length < 10 && (
                    <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800/60 hover:bg-brand-50/40 hover:border-brand-300 dark:hover:bg-gray-800 transition-colors">
                      <i className="bx bx-plus text-2xl text-gray-400 dark:text-gray-500"></i>
                      <span className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{t('addMoreImages') || 'Add more'}</span>
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
              </div>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(base)}
          >
            {t('cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? t('saving') || 'Saving...' : isEditMode ? t('save') || 'Save' : t('create') || 'Create'}
          </Button>
        </div>
      </form>

      {/* Add Category Modal */}
      <Modal isOpen={showAddCategory} onClose={() => setShowAddCategory(false)} title={t('addCategory') || 'Add Category'}>
        <div className="space-y-4">
          <FormField
            name="categoryName"
            type="text"
            label={t('categoryName')}
            value={newCategory.name}
            onChange={(value) => setNewCategory({ name: value })}
            placeholder={t('categoryName')}
          />
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setShowAddCategory(false)}>
              {t('cancel')}
            </Button>
            <Button type="button" variant="primary" onClick={handleAddCategory}>
              {t('add')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Subcategory Modal */}
      <Modal isOpen={showAddSubcategory} onClose={() => setShowAddSubcategory(false)} title={t('addSubcategory') || 'Add Subcategory'}>
        <div className="space-y-4">
          <FormField
            name="subcategoryName"
            type="text"
            label={t('subcategoryName')}
            value={newSubcategory.name}
            onChange={(value) => setNewSubcategory({ name: value })}
            placeholder={t('subcategoryName')}
          />
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setShowAddSubcategory(false)}>
              {t('cancel')}
            </Button>
            <Button type="button" variant="primary" onClick={handleAddSubcategory}>
              {t('add')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add UOM Modal */}
      <Modal isOpen={showAddUom} onClose={() => setShowAddUom(false)} title={t('addUom') || 'Add UOM'}>
        <div className="space-y-4">
          <FormField
            name="uomName"
            type="text"
            label={t('name')}
            required
            value={newUom.name}
            onChange={(value) => setNewUom({ ...newUom, name: value })}
            placeholder={t('name')}
          />
          <FormField
            name="uomAbbreviation"
            type="text"
            label={t('abbreviation')}
            value={newUom.abbreviation}
            onChange={(value) => setNewUom({ ...newUom, abbreviation: value })}
            placeholder={t('abbreviation')}
          />
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setShowAddUom(false)}>
              {t('cancel')}
            </Button>
            <Button type="button" variant="primary" onClick={handleAddUom}>
              {t('add')}
            </Button>
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
            <FormField
              name="conversionFactor"
              type="number"
              label={t('factor') || 'Factor'}
              required
              step={0.000001}
              min={0.000001}
              value={newConversion.factor}
              onChange={(value) => setNewConversion({ ...newConversion, factor: value })}
              placeholder="e.g., 0.5, 2, 10"
            />
            {conversionExample && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                {conversionExample}
              </p>
            )}
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddConversion(false);
                setNewConversion({ fromUomId: '', toUomId: '', factor: '' });
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleAddConversion}
              disabled={!newConversion.fromUomId || !newConversion.toUomId || !newConversion.factor || newConversion.fromUomId === newConversion.toUomId}
            >
              {t('add')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Image Upload Modal */}
      <Modal isOpen={showImageUpload} onClose={() => setShowImageUpload(false)} title={t('uploadImages') || 'Upload Images'}>
        <div className="space-y-4">
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
            <Button type="button" variant="primary" onClick={() => setShowImageUpload(false)}>
              {t('done')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
