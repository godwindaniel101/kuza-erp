import { api } from '@/lib/api';

/**
 * Upload a single image file to the backend object store and return the stored
 * URL. The server compresses the image and persists it to the configured driver
 * (local disk in dev, GCS/S3 in prod); the DB only ever holds this URL.
 */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<{ success: boolean; data: { url: string } }>(
    '/ims/inventory/upload-image',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.url;
}
