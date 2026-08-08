import { api } from '@/lib/api';

/**
 * Upload a single image file to the backend object store and return the stored
 * URL. The server compresses the image and persists it to the configured driver
 * (local disk in dev, GCS/S3 in prod); the DB only ever holds this URL.
 */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  // Do NOT force a Content-Type here. The axios instance defaults to
  // application/json; a hard 'multipart/form-data' has no boundary parameter,
  // so the server's multer parser finds no file and the controller 400s with
  // "No file uploaded". Setting it to undefined lets the browser emit
  // `multipart/form-data; boundary=…` itself, which multer can parse.
  const res = await api.post<{ success: boolean; data: { url: string } }>(
    '/ims/inventory/upload-image',
    formData,
    { headers: { 'Content-Type': undefined } },
  );
  return res.data.url;
}
