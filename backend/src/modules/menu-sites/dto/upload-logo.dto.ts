import { IsString, Matches } from 'class-validator';

/**
 * Logo upload payload — a base64 data URL (NOT multipart, matching the
 * ~50MB JSON body limit configured in main.ts). The regex enforces the
 * `data:image/<type>;base64,` prefix for the supported raster/SVG types;
 * the service re-validates and decodes before writing to disk.
 */
export class UploadLogoDto {
  @IsString()
  @Matches(/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/, {
    message:
      'dataUrl must be a base64 data URL for a png, jpeg, jpg, webp or svg+xml image',
  })
  dataUrl!: string;
}
