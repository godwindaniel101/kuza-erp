import { useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';
import type {
  BulkUploadResponse,
  BulkUploadDetailedError,
} from '@/utils/bulkUploadHandler';

type Step = 1 | 2;

interface UploadResult {
  successCount: number;
  failedCount: number;
  skippedCount: number;
  detailedErrors: BulkUploadDetailedError[];
  rawSuccess: boolean;
  message?: string;
}

interface BulkUploadWizardProps {
  isOpen: boolean;
  onClose: () => void;
  /** GET endpoint returning { data: { csv } }. */
  templateUrl: string;
  /** POST endpoint accepting { csv } and returning the bulk-upload response. */
  uploadUrl: string;
  /** Display name e.g. "items", "employees" — used in copy + filenames. */
  entityName?: string;
  /** Accent (red=IMS, blue=HRMS). */
  accent?: 'red' | 'blue';
  /** Called after a completed upload (any success) so the page can refresh. */
  onComplete?: () => void | Promise<void>;
  /** Optional list of required column names to show as a hint. */
  requiredColumns?: string[];
  /** Max preview rows. */
  previewRows?: number;
}

/** Minimal CSV parser (handles quoted fields + escaped quotes). Dependency-free. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      field = '';
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

export default function BulkUploadWizard({
  isOpen,
  onClose,
  templateUrl,
  uploadUrl,
  entityName = 'items',
  accent = 'red',
  onComplete,
  requiredColumns,
  previewRows = 5,
}: BulkUploadWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const accentSolid =
    accent === 'blue'
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : 'bg-brand-600 text-white hover:bg-brand-700';
  const accentSoft =
    accent === 'blue'
      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
      : 'border-red-500 bg-red-50 dark:bg-red-900/20';
  const accentText =
    accent === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';

  const parsed = useMemo(() => (csvText ? parseCsv(csvText) : []), [csvText]);
  const headers = parsed[0] ?? [];
  const previewData = parsed.slice(1, 1 + previewRows);
  const dataRowCount = Math.max(0, parsed.length - 1);

  const reset = () => {
    setStep(1);
    setFile(null);
    setCsvText('');
    setDragActive(false);
    setError(null);
    setResult(null);
    setUploading(false);
    setDownloading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const downloadTemplate = async () => {
    setDownloading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; data?: { csv: string } }>(templateUrl);
      const csv = response?.data?.csv;
      if (!csv) {
        throw new Error('Template not available');
      }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entityName}_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to download template');
    } finally {
      setDownloading(false);
    }
  };

  const acceptFile = async (selected: File) => {
    if (!(selected.type === 'text/csv' || selected.name.toLowerCase().endsWith('.csv'))) {
      setError('Please upload a CSV file');
      return;
    }
    setError(null);
    setFile(selected);
    try {
      const text = await selected.text();
      setCsvText(text);
    } catch {
      setError('Could not read file');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void acceptFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setCsvText('');
    setError(null);
  };

  const handleUpload = async () => {
    if (!csvText) return;
    setUploading(true);
    setError(null);
    try {
      const response = await api.post<BulkUploadResponse>(uploadUrl, { csv: csvText });
      const data = response?.data;
      const detailedErrors = data?.detailedErrors ?? [];
      const successCount = data?.summary?.successful ?? data?.success ?? 0;
      const failedCount =
        data?.summary?.failed ?? data?.failed ?? detailedErrors.length ?? 0;
      const skippedCount = data?.summary?.skipped ?? data?.skipped ?? 0;

      setResult({
        successCount,
        failedCount,
        skippedCount,
        detailedErrors,
        rawSuccess: !!response?.success,
        message: response?.message,
      });
      setStep(2);

      if (successCount > 0 && onComplete) {
        try {
          await onComplete();
        } catch (cbErr) {
          console.error('BulkUploadWizard onComplete error:', cbErr);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || `Failed to upload ${entityName}`);
    } finally {
      setUploading(false);
    }
  };

  const downloadFailedRows = () => {
    if (!result || result.detailedErrors.length === 0) return;
    const header = headers.length ? ['Line', ...headers, 'Errors'] : ['Line', 'Data', 'Errors'];
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [header.map(escape).join(',')];
    result.detailedErrors.forEach((e) => {
      lines.push([escape(String(e.line)), escape(e.data ?? ''), escape(e.errors.join('; '))].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityName}_failed_rows.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Bulk Upload ${entityName}`} maxWidth="2xl">
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <i className="bx bx-error-circle mt-0.5" aria-hidden="true"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Upload (template link + drag-drop + inline preview/confirm) */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Upload a CSV to import {entityName} in bulk.
              </p>
              <button
                type="button"
                onClick={downloadTemplate}
                disabled={downloading}
                className={`text-sm inline-flex items-center whitespace-nowrap hover:underline disabled:opacity-60 ${accentText}`}
              >
                <i className="bx bx-download mr-1" aria-hidden="true"></i>
                {downloading ? 'Downloading…' : 'Download template'}
              </button>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-100 ${
                dragActive
                  ? accentSoft
                  : file
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void acceptFile(f);
                }}
                className="hidden"
                id="bulk-wizard-file"
              />
              {file ? (
                <div className="space-y-2">
                  <i className="bx bx-check-circle text-3xl text-green-500" aria-hidden="true"></i>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">{file.name}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {dataRowCount} row(s) · {headers.length} column(s) · {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <i className="bx bx-cloud-upload text-3xl text-gray-400 dark:text-gray-500" aria-hidden="true"></i>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Drag and drop your CSV file here, or</p>
                  <label
                    htmlFor="bulk-wizard-file"
                    className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors ${accentSolid}`}
                  >
                    <i className="bx bx-upload mr-1" aria-hidden="true"></i>
                    Browse files
                  </label>
                </div>
              )}
            </div>

            {!file && requiredColumns && requiredColumns.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">Required columns:</span> {requiredColumns.join(', ')}
              </p>
            )}

            {previewData.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Preview — first {previewData.length} of {dataRowCount} row(s)
                </p>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full text-xs divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        {headers.map((h, i) => (
                          <th
                            key={i}
                            className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {previewData.map((r, ri) => (
                        <tr key={ri}>
                          {headers.map((_, ci) => (
                            <td key={ci} className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              {r[ci] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Results */}
        {step === 2 && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3 text-center">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">{result.successCount}</div>
                <div className="text-xs text-green-600 dark:text-green-400">Imported</div>
              </div>
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-center">
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{result.failedCount}</div>
                <div className="text-xs text-red-600 dark:text-red-400">Failed</div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3 text-center">
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{result.skippedCount}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Skipped</div>
              </div>
            </div>

            {result.message && (
              <p className="text-sm text-gray-600 dark:text-gray-300">{result.message}</p>
            )}

            {result.detailedErrors.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Errors ({result.detailedErrors.length})
                  </h4>
                  <button
                    type="button"
                    onClick={downloadFailedRows}
                    className="text-xs text-gray-600 dark:text-gray-300 hover:underline inline-flex items-center"
                  >
                    <i className="bx bx-download mr-1" aria-hidden="true"></i>
                    Download failed rows
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full text-xs divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300 w-16">Line</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-300">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {result.detailedErrors.map((e, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300 align-top">{e.line}</td>
                          <td className="px-3 py-2 text-red-600 dark:text-red-400">{e.errors.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer navigation */}
        <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            {step === 2 ? 'Close' : 'Cancel'}
          </button>

          {step === 1 && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || !csvText || dataRowCount === 0}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center disabled:bg-gray-400 disabled:dark:bg-gray-600 disabled:cursor-not-allowed ${accentSolid}`}
            >
              {uploading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Uploading…
                </>
              ) : (
                <>
                  <i className="bx bx-upload mr-2" aria-hidden="true"></i>
                  Upload {dataRowCount > 0 ? `${dataRowCount} ${entityName}` : entityName}
                </>
              )}
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={() => reset()}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              Upload another
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
