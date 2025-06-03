import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, ServerSideEncryption } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export interface UploadOptions {
  folder: string;
  fileName?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  size: number;
  contentType: string;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    const awsConfig = this.configService.get('aws');
    
    this.s3Client = new S3Client({
      region: awsConfig.region,
      credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
      },
    });

    this.bucketName = awsConfig.s3.bucket;
    this.region = awsConfig.region;

    this.logger.log(`S3 Service initialized with bucket: ${this.bucketName}`);
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    file: Express.Multer.File,
    options: UploadOptions,
  ): Promise<UploadResult> {
    try {
      const fileExtension = this.getFileExtension(file.originalname);
      const fileName = options.fileName || `${uuidv4()}${fileExtension}`;
      const key = `${options.folder}/${fileName}`;

      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: options.contentType || file.mimetype,
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          ...options.metadata,
        },
        // Set proper cache control and security headers
        CacheControl: 'max-age=31536000', // 1 year
        ServerSideEncryption: ServerSideEncryption.AES256,
      };

      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

      this.logger.log(`File uploaded successfully: ${key}`);

      return {
        url,
        key,
        bucket: this.bucketName,
        size: file.size,
        contentType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to upload file to storage');
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const deleteParams = {
        Bucket: this.bucketName,
        Key: key,
      };

      const command = new DeleteObjectCommand(deleteParams);
      await this.s3Client.send(command);

      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete file from storage');
    }
  }

  /**
   * Check if a file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const headParams = {
        Bucket: this.bucketName,
        Key: key,
      };

      const command = new HeadObjectCommand(headParams);
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      this.logger.error(`Error checking file existence: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate a presigned URL for direct client uploads
   */
  async generatePresignedUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return presignedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`);
      throw new InternalServerErrorException('Failed to generate upload URL');
    }
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  }

  /**
   * Generate a safe filename based on user ID and current timestamp
   */
  generateSafeFileName(userId: string, originalName: string, prefix?: string): string {
    const timestamp = Date.now();
    const extension = this.getFileExtension(originalName);
    const safePrefix = prefix ? `${prefix}-` : '';
    return `${safePrefix}${userId}-${timestamp}${extension}`;
  }

  /**
   * Extract key from S3 URL
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const regex = new RegExp(`https://${this.bucketName}\\.s3\\.${this.region}\\.amazonaws\\.com/(.+)`);
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch (error) {
      this.logger.error(`Failed to extract key from URL: ${url}`);
      return null;
    }
  }
} 