import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { api } from '@/lib/api';
import { handleBulkUploadResponse, logBulkUploadErrors, type BulkUploadResponse } from '@/utils/bulkUploadHandler';

export interface UseBulkUploadOptions {
  endpoint: string;
  entityName?: string;
  onSuccess?: () => void | Promise<void>;
  onError?: (error: string) => void;
}

export interface UseBulkUploadReturn {
  uploading: boolean;
  handleBulkUpload: (file: File) => Promise<{
    success: boolean;
    shouldCloseModal: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
    toastType: 'success' | 'error'; // For Toast components that only support success/error
  }>;
}

/**
 * Custom hook for handling bulk uploads with consistent error handling
 * 
 * @param options Configuration options for the bulk upload
 * @returns Object with uploading state and handleBulkUpload function
 * 
 * @example
 * ```tsx
 * const { uploading, handleBulkUpload } = useBulkUpload({
 *   endpoint: '/ims/inventory/bulk-upload',
 *   entityName: 'items',
 *   onSuccess: async () => {
 *     await loadItems();
 *     await loadCategories();
 *   }
 * });
 * 
 * // In your form handler
 * const onSubmit = async (e: React.FormEvent) => {
 *   e.preventDefault();
 *   if (!file) return;
 *   
 *   const result = await handleBulkUpload(file);
 *   setToast({ message: result.message, type: result.toastType });
 *   
 *   if (result.shouldCloseModal) {
 *     setShowModal(false);
 *     setFile(null);
 *   }
 * };
 * ```
 */
export function useBulkUpload(options: UseBulkUploadOptions): UseBulkUploadReturn {
  const { t } = useTranslation('common');
  const [uploading, setUploading] = useState(false);

  const handleBulkUpload = async (file: File) => {
    if (!file) {
      return {
        success: false,
        shouldCloseModal: false,
        message: t('pleaseSelectAFile') || 'Please select a file',
        type: 'error' as const,
        toastType: 'error' as const
      };
    }

    setUploading(true);
    
    try {
      // Read CSV file as text
      const csvText = await file.text();
      
      // Make API request
      const response = await api.post<BulkUploadResponse>(options.endpoint, {
        csv: csvText,
      });

      // Use the global bulk upload handler
      const result = handleBulkUploadResponse(response, t, options.entityName || 'items');
      
      // Log detailed errors to console for debugging
      logBulkUploadErrors(response, options.entityName || 'items');
      
      // Call success callback if provided and upload was successful
      if (result.shouldCloseModal && result.type !== 'error' && options.onSuccess) {
        try {
          await options.onSuccess();
        } catch (callbackError) {
          console.error('Error in onSuccess callback:', callbackError);
        }
      }

      return {
        success: result.type !== 'error',
        shouldCloseModal: result.shouldCloseModal,
        message: result.message,
        type: result.type,
        toastType: result.type === 'info' ? 'success' : result.type
      };
      
    } catch (err: any) {
      console.error(`Failed to upload ${options.entityName || 'items'}:`, err);
      const errorMessage = err.response?.data?.message || err.message || t('uploadFailed') || `Failed to upload ${options.entityName || 'items'}`;
      
      // Call error callback if provided
      if (options.onError) {
        options.onError(errorMessage);
      }

      return {
        success: false,
        shouldCloseModal: false,
        message: errorMessage,
        type: 'error' as const,
        toastType: 'error' as const
      };
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    handleBulkUpload
  };
}
