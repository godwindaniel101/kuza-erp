import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger body for the multipart image upload endpoint.
 */
export class UploadImageDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any; // multipart file part (typed at the handler as UploadedImageFile)
}

/**
 * Minimal shape of a multer memory-storage file. Declared locally because the
 * repo has no `@types/multer`, so the global `Express.Multer.File` type is not
 * available.
 */
export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
}
