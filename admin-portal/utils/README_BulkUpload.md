# Bulk Upload Error Handling

This directory contains utilities for handling bulk upload operations with consistent error handling across the application.

## Files

- `bulkUploadHandler.ts` - Global handler for processing bulk upload responses
- `useBulkUpload.ts` - React hook for handling bulk uploads (located in `/hooks/`)

## Usage

### Option 1: Using the Global Handler Function

```tsx
import { handleBulkUploadResponse, logBulkUploadErrors, type BulkUploadResponse } from '@/utils/bulkUploadHandler';

const handleBulkUpload = async (file: File) => {
  try {
    const csvText = await file.text();
    const response = await api.post<BulkUploadResponse>('/api/bulk-upload', {
      csv: csvText,
    });

    // Use the global bulk upload handler
    const result = handleBulkUploadResponse(response, t, 'items');
    
    // Log detailed errors to console for debugging
    logBulkUploadErrors(response, 'items');
    
    // Show the result toast
    setToast({
      message: result.message,
      type: result.type
    });
    
    // Close modal and reload data if successful
    if (result.shouldCloseModal) {
      setShowModal(false);
      setFile(null);
      await reloadData();
    }
  } catch (err: any) {
    setToast({ 
      message: err.response?.data?.message || 'Upload failed', 
      type: 'error' 
    });
  }
};
```

### Option 2: Using the React Hook

```tsx
import { useBulkUpload } from '@/hooks/useBulkUpload';

const MyComponent = () => {
  const [file, setFile] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);

  const { uploading, handleBulkUpload } = useBulkUpload({
    endpoint: '/api/bulk-upload',
    entityName: 'items',
    onSuccess: async () => {
      await loadItems();
      await loadCategories();
    }
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    
    const result = await handleBulkUpload(file);
    setToast({ message: result.message, type: result.type });
    
    if (result.shouldCloseModal) {
      setShowModal(false);
      setFile(null);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      {/* Your upload form */}
      <button type="submit" disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  );
};
```

## Supported Error Response Formats

The global handler supports various API response formats:

### Format 1: Success with detailed summary
```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 100,
      "processed": 95,
      "successful": 90,
      "failed": 5,
      "skipped": 5
    },
    "detailedErrors": [
      {
        "line": 10,
        "data": "invalid data here",
        "errors": ["Invalid email format", "Phone number required"]
      }
    ]
  }
}
```

### Format 2: Legacy format with simple counters
```json
{
  "success": true,
  "data": {
    "success": 90,
    "errors": ["Line 10: Invalid email", "Line 15: Missing phone"],
    "skipped": 5,
    "failedUploads": [...]
  }
}
```

### Format 3: API-level errors
```json
{
  "success": false,
  "data": {
    "errors": ["CSV file is empty"],
    "summary": {
      "total": 0,
      "processed": 0,
      "successful": 0,
      "failed": 0,
      "skipped": 0
    }
  },
  "message": "Upload failed"
}
```

## Features

- **Consistent Error Handling**: All bulk upload responses are processed uniformly
- **Detailed Error Display**: Shows line-by-line errors with context
- **Console Logging**: Detailed errors are logged to console for debugging
- **Internationalization**: Supports i18next translations
- **Modal Management**: Automatically determines when to close upload modals
- **Toast Notifications**: Provides appropriate success/error/info messages

## Entity Names

The handler supports different entity names for appropriate messaging:
- `'items'` - For inventory items
- `'inflows'` - For inventory inflows
- `'employees'` - For employee data
- `'branches'` - For branch data
- Any other string - Generic handling

## Error Message Priority

The handler checks for errors in this order:
1. Detailed errors (`detailedErrors` array)
2. General errors (`errors` array)
3. Failed uploads (`failedUploads` array)
4. API-level error messages

## Translation Keys

The handler uses these translation keys (with fallbacks):
- `itemsImportedSuccessfully`
- `inflowsImportedSuccessfully`  
- `employeesImportedSuccessfully`
- `branchesImportedSuccessfully`
- `errorsOccurred`
- `emptyRowsSkipped`
- `andXMore`
- `detailedErrors`
- `errors`
- `failedUploads`
- `uploadFailed`
- `uploadCompletedSuccessfully`
- `uploadCompleted`
- `unexpectedErrorOccurred`
