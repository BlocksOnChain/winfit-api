import {
  PipeTransform,
  Injectable,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';

@Injectable()
export class ImageValidationPipe implements PipeTransform {
  private readonly maxSize: number;
  private readonly allowedMimeTypes: string[];
  private readonly allowedExtensions: string[];

  constructor(
    maxSizeMB: number = 5,
    allowedMimeTypes: string[] = ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: string[] = ['.jpg', '.jpeg', '.png', '.webp'],
  ) {
    this.maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    this.allowedMimeTypes = allowedMimeTypes;
    this.allowedExtensions = allowedExtensions;
  }

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size
    if (file.size > this.maxSize) {
      throw new PayloadTooLargeException(
        `File size exceeds maximum allowed size of ${this.maxSize / (1024 * 1024)}MB`,
      );
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    // Check file extension
    const fileName = file.originalname.toLowerCase();
    const hasValidExtension = this.allowedExtensions.some(ext =>
      fileName.endsWith(ext),
    );

    if (!hasValidExtension) {
      throw new BadRequestException(
        `Invalid file extension. Allowed extensions: ${this.allowedExtensions.join(', ')}`,
      );
    }

    // Additional validation: Check if file buffer exists
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('File appears to be empty or corrupted');
    }

    return file;
  }
}

@Injectable()
export class AvatarValidationPipe extends ImageValidationPipe {
  constructor() {
    super(5, ['image/jpeg', 'image/png', 'image/webp'], ['.jpg', '.jpeg', '.png', '.webp']);
  }
}

@Injectable()
export class ChallengeImageValidationPipe extends ImageValidationPipe {
  constructor() {
    super(10, ['image/jpeg', 'image/png', 'image/webp'], ['.jpg', '.jpeg', '.png', '.webp']);
  }
} 