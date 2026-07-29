// Interface for tracking failed upload rows
export interface FailedUpload {
  lineNumber: number;
  rowData: Record<string, string>;
  errors: string[];
  status: "failed" | "skipped";
}

// Interface for bulk upload results with detailed tracking
export interface BulkUploadResult {
  success: number;
  errors: string[];
  failedUploads: FailedUpload[];
  duplicateSkipped: number;
  summary: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
  };
}

// Interface for API response format that the UI expects
export interface BulkUploadApiResponse {
  success: boolean;
  data: {
    summary: {
      total: number;
      processed: number;
      successful: number;
      failed: number;
      skipped: number;
    };
    errors: string[];
    failedUploads: FailedUpload[];
  };
  message: string;
}
