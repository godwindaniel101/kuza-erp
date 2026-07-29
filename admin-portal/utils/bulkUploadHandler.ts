import { TFunction } from 'next-i18next';

// Interface for bulk upload response data
export interface BulkUploadSummary {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
}

export interface BulkUploadDetailedError {
  line: number;
  data: string;
  errors: string[];
}

export interface BulkUploadResponseData {
  summary?: BulkUploadSummary;
  errors?: string[];
  success?: number;
  failed?: number;
  skipped?: number;
  detailedErrors?: BulkUploadDetailedError[];
  failedUploads?: any[];
}

export interface BulkUploadResponse {
  success: boolean;
  data?: BulkUploadResponseData;
  message?: string;
}

export interface BulkUploadResult {
  type: 'success' | 'error' | 'info';
  message: string;
  shouldCloseModal: boolean;
}

/**
 * Global handler for bulk upload responses
 * Handles various error formats and success scenarios consistently
 */
export function handleBulkUploadResponse(
  response: BulkUploadResponse,
  t: TFunction,
  entityName: string = 'items' // e.g., 'items', 'inflows', 'employees'
): BulkUploadResult {
  // Handle API-level errors (success: false)
  if (!response.success) {
    const baseErrorMessage = response.message || t('uploadFailed') || 'Upload failed';
    
    // Check if it's an empty file error or similar critical error
    const errors = response.data?.errors || [];
    const hasEmptyFileError = errors.some(error => 
      error.toLowerCase().includes('empty') || 
      error.toLowerCase().includes('no data') ||
      error.toLowerCase().includes('header')
    );

    // Build comprehensive error message including all errors from data.errors
    let fullErrorMessage = baseErrorMessage;
    
    if (errors.length > 0) {
      // Show all errors in detail
      fullErrorMessage += `\n\n${t('errors') || 'Errors'}:\n${errors.map((error, index) => `${index + 1}. ${error}`).join('\n')}`;
    }

    // Also show any detailed errors if present
    const detailedErrors = response.data?.detailedErrors || [];
    if (detailedErrors.length > 0) {
      const allErrorDetails = detailedErrors.map(error => 
        `Line ${error.line}: ${error.errors.join(', ')}`
      );
      fullErrorMessage += `\n\n${t('detailedErrors') || 'Detailed Errors'}:\n${allErrorDetails.join('\n')}`;
    }

    // Show failed uploads if present
    const failedUploads = response.data?.failedUploads || [];
    if (failedUploads.length > 0 && failedUploads.some(upload => upload && (upload.error || upload.errors || upload.message))) {
      const failedDetails = failedUploads
        .filter(upload => upload && (upload.error || upload.errors || upload.message))
        .map((upload, index) => {
          const errorMsg = upload.error || upload.message || (upload.errors && upload.errors.join(', ')) || 'Unknown error';
          const lineInfo = upload.line ? `Line ${upload.line}` : `Item ${index + 1}`;
          return `${lineInfo}: ${errorMsg}`;
        });

      if (failedDetails.length > 0) {
        fullErrorMessage += `\n\n${t('failedUploadDetails') || 'Failed Upload Details'}:\n${failedDetails.join('\n')}`;
      }
    }

    return {
      type: 'error',
      message: fullErrorMessage,
      shouldCloseModal: !hasEmptyFileError // Keep modal open for file issues
    };
  }

  // Handle successful API response but with processing errors
  if (response.success && response.data) {
    const data = response.data;
    
    // Normalize counts from different response formats
    const successCount = data.summary?.successful ?? data.success ?? 0;
    const failedCount = data.summary?.failed ?? data.failed ?? (data.detailedErrors?.length || 0);
    const skippedCount = data.summary?.skipped ?? data.skipped ?? 0;
    const totalCount = data.summary?.total ?? (successCount + failedCount + skippedCount);
    
    // Get errors from various sources
    const detailedErrors = data.detailedErrors || [];
    const generalErrors = data.errors || [];
    const failedUploads = data.failedUploads || [];

    // Build success message
    let message = '';
    if (successCount > 0) {
      if (entityName === 'inflows') {
        message = t('inflowsImportedSuccessfully', { count: successCount }) || `${successCount} inflows imported successfully`;
      } else if (entityName === 'employees') {
        message = t('employeesImportedSuccessfully', { count: successCount }) || `${successCount} employees imported successfully`;
      } else if (entityName === 'branches') {
        message = t('branchesImportedSuccessfully', { count: successCount }) || `${successCount} branches imported successfully`;
      } else {
        message = t('itemsImportedSuccessfully', { count: successCount }) || `${successCount} ${entityName} imported successfully`;
      }
    }

    // Handle skipped items
    if (skippedCount > 0) {
      const skippedText = t('emptyRowsSkipped', { count: skippedCount }) || `${skippedCount} empty row(s) skipped`;
      message += message ? `. ${skippedText}` : skippedText;
    }

    // Handle errors - show ALL errors in detail
    if (detailedErrors.length > 0) {
      const errorText = t('errorsOccurred', { count: detailedErrors.length }) || `${detailedErrors.length} error(s) occurred`;
      message += message ? `. ${errorText}` : errorText;

      // Show ALL detailed line-by-line errors (not just first 3)
      const allErrorDetails = detailedErrors.map(error => 
        `Line ${error.line}: ${error.errors.join(', ')}`
      );

      message += `\n\n${t('detailedErrors') || 'Detailed Errors'}:\n${allErrorDetails.join('\n')}`;

    } else if (generalErrors.length > 0) {
      // Show ALL general errors if no detailed errors
      const errorText = t('errorsOccurred', { count: generalErrors.length }) || `${generalErrors.length} error(s) occurred`;
      message += message ? `. ${errorText}` : errorText;

      // Show ALL errors, not just first 5
      message += `\n\n${t('errors') || 'Errors'}:\n${generalErrors.map((error, index) => `${index + 1}. ${error}`).join('\n')}`;
    }

    // Handle failed uploads (legacy format) - show all failed uploads
    if (failedUploads.length > 0 && detailedErrors.length === 0 && generalErrors.length === 0) {
      const errorText = t('failedUploads', { count: failedUploads.length }) || `${failedUploads.length} upload(s) failed`;
      message += message ? `. ${errorText}` : errorText;

      // Show details of failed uploads if available
      if (failedUploads.some(upload => upload && (upload.error || upload.errors || upload.message))) {
        const failedDetails = failedUploads
          .filter(upload => upload && (upload.error || upload.errors || upload.message))
          .map((upload, index) => {
            const errorMsg = upload.error || upload.message || (upload.errors && upload.errors.join(', ')) || 'Unknown error';
            const lineInfo = upload.line ? `Line ${upload.line}` : `Item ${index + 1}`;
            return `${lineInfo}: ${errorMsg}`;
          });

        if (failedDetails.length > 0) {
          message += `\n\n${t('failedUploadDetails') || 'Failed Upload Details'}:\n${failedDetails.join('\n')}`;
        }
      }
    }

    // Determine message type and whether to close modal
    let type: 'success' | 'error' | 'info' = 'success';
    let shouldCloseModal = true;

    if (successCount === 0 && (detailedErrors.length > 0 || generalErrors.length > 0 || failedUploads.length > 0)) {
      type = 'error';
      shouldCloseModal = false; // Keep modal open if nothing succeeded
    } else if (detailedErrors.length > 0 || generalErrors.length > 0 || failedUploads.length > 0) {
      type = 'info'; // Partial success
      shouldCloseModal = true; // Close modal but show info about errors
    }

    // Fallback message
    if (!message) {
      message = successCount > 0 
        ? (t('uploadCompletedSuccessfully') || 'Upload completed successfully')
        : (t('uploadCompleted') || 'Upload completed');
    }

    return {
      type,
      message,
      shouldCloseModal
    };
  }

  // Fallback for unexpected response structure
  return {
    type: 'error',
    message: t('unexpectedErrorOccurred') || 'An unexpected error occurred',
    shouldCloseModal: false
  };
}

/**
 * Helper function to log detailed errors to console for debugging
 */
export function logBulkUploadErrors(
  response: BulkUploadResponse,
  entityName: string = 'items'
): void {
  if (!response.success || !response.data) {
    console.error(`[BulkUpload:${entityName}] API Error:`, response.message);
    return;
  }

  const data = response.data;
  
  if (data.detailedErrors && data.detailedErrors.length > 0) {
    console.group(`[BulkUpload:${entityName}] Detailed Errors`);
    data.detailedErrors.forEach(error => {
      console.error(`Line ${error.line}:`, error.errors.join(', '));
      console.debug('Data:', error.data);
    });
    console.groupEnd();
  }

  if (data.errors && data.errors.length > 0) {
    console.group(`[BulkUpload:${entityName}] General Errors`);
    data.errors.forEach((error, index) => {
      console.error(`Error ${index + 1}:`, error);
    });
    console.groupEnd();
  }

  if (data.failedUploads && data.failedUploads.length > 0) {
    console.group(`[BulkUpload:${entityName}] Failed Uploads`);
    data.failedUploads.forEach((upload, index) => {
      console.error(`Failed Upload ${index + 1}:`, upload);
    });
    console.groupEnd();
  }
}
