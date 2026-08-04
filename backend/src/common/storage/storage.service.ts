import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Object storage abstraction for item/product images.
 *
 * The driver is chosen at runtime via `STORAGE_DRIVER` (default `local`):
 *   - `local` — writes under `<cwd>/uploads/<key>` and returns a RELATIVE URL
 *     (`/uploads/<key>`). The frontend `resolveImageUrl` prefixes the API origin,
 *     so behaviour matches today's local-disk uploads.
 *   - `gcs`   — Google Cloud Storage. Returns a public https URL.
 *   - `s3`    — Amazon S3 (or S3-compatible). Returns a public https URL.
 *
 * The cloud SDKs are `require()`d lazily INSIDE each driver so a `local`
 * (default / dev) install never loads them, and a build/typecheck passes
 * without `@google-cloud/storage` or `@aws-sdk/client-s3` installed.
 */
@Injectable()
export class StorageService {
  constructor(private readonly configService: ConfigService) {}

  private get driver(): string {
    return this.configService.get<string>('STORAGE_DRIVER') || 'local';
  }

  /**
   * Build a tenant-prefixed object key: `${schema}/${folder}/${uuid}.${ext}`.
   * The schema segment isolates one tenant's objects from another's.
   */
  buildKey(schema: string, folder: string, ext = 'jpg'): string {
    return `${schema}/${folder}/${crypto.randomUUID()}.${ext}`;
  }

  /**
   * Upload `buffer` to `key` (the full, already tenant-prefixed object path)
   * and return the URL to persist on the item. `key` must not be caller-derived
   * from untrusted input beyond the validated tenant schema + a uuid.
   */
  async upload(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    switch (this.driver) {
      case 'gcs':
        return this.uploadGcs(buffer, key, contentType);
      case 's3':
        return this.uploadS3(buffer, key, contentType);
      case 'local':
      default:
        return this.uploadLocal(buffer, key);
    }
  }

  private async uploadLocal(buffer: Buffer, key: string): Promise<string> {
    const filePath = path.join(process.cwd(), 'uploads', key);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, buffer);
    // RELATIVE URL — resolveImageUrl on the frontend prefixes the API origin.
    return `/uploads/${key}`;
  }

  private async uploadGcs(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    const bucketName = this.configService.get<string>('GCS_BUCKET');
    if (!bucketName) {
      throw new InternalServerErrorException(
        'STORAGE_DRIVER=gcs requires GCS_BUCKET',
      );
    }
    // Lazy require: the SDK loads only when the gcs driver is actually used.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Storage } = require('@google-cloud/storage');
    const keyFile = this.configService.get<string>('GCS_KEY_FILE');
    // new Storage() uses Application Default Credentials (Cloud Run service
    // account) unless GCS_KEY_FILE points at an explicit key file.
    const storage = new Storage(keyFile ? { keyFilename: keyFile } : {});
    await storage.bucket(bucketName).file(key).save(buffer, {
      contentType,
      resumable: false,
      metadata: { cacheControl: 'public, max-age=31536000' },
    });
    // NOTE: makePublic() is intentionally NOT called — uniform bucket-level
    // access buckets reject per-object ACLs. The bucket must grant public read
    // (allUsers: Storage Object Viewer), or set GCS_PUBLIC_BASE to a CDN origin.
    const publicBase = this.configService.get<string>('GCS_PUBLIC_BASE');
    return publicBase
      ? `${publicBase.replace(/\/+$/, '')}/${key}`
      : `https://storage.googleapis.com/${bucketName}/${key}`;
  }

  private async uploadS3(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    const bucketName = this.configService.get<string>('S3_BUCKET');
    const region = this.configService.get<string>('S3_REGION');
    if (!bucketName) {
      throw new InternalServerErrorException(
        'STORAGE_DRIVER=s3 requires S3_BUCKET',
      );
    }
    if (!region) {
      throw new InternalServerErrorException(
        'STORAGE_DRIVER=s3 requires S3_REGION',
      );
    }
    // Lazy require: SDK loads only when the s3 driver is actually used.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    // Credentials come from the default provider chain (env vars / instance
    // role) — no static keys in code.
    const client = new S3Client({ region });
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
      }),
    );
    const publicBase = this.configService.get<string>('S3_PUBLIC_BASE');
    return publicBase
      ? `${publicBase.replace(/\/+$/, '')}/${key}`
      : `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  }
}
