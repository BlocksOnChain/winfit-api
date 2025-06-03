import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S3Service, UploadResult } from './services/s3.service';
import { User } from '../users/entities/user.entity';
import { UploadResponseDto } from './dto/file-upload.dto';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly s3Service: S3Service,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Upload user avatar and update user profile
   */
  async uploadAvatar(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadResponseDto> {
    try {
      this.logger.log(`Uploading avatar for user: ${userId}`);

      // Find the user to get current avatar URL (for cleanup)
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Generate safe filename
      const fileName = this.s3Service.generateSafeFileName(
        userId,
        file.originalname,
        'avatar',
      );

      // Upload to S3
      const uploadResult: UploadResult = await this.s3Service.uploadFile(file, {
        folder: `avatars/${userId}`,
        fileName,
        metadata: {
          userId,
          type: 'avatar',
        },
      });

      // Update user's avatar URL in database
      await this.userRepository.update(userId, {
        avatarUrl: uploadResult.url,
      });

      // Clean up old avatar if exists
      if (user.avatarUrl) {
        const oldKey = this.s3Service.extractKeyFromUrl(user.avatarUrl);
        if (oldKey) {
          try {
            await this.s3Service.deleteFile(oldKey);
            this.logger.log(`Deleted old avatar: ${oldKey}`);
          } catch (error) {
            this.logger.warn(`Failed to delete old avatar: ${error.message}`);
          }
        }
      }

      this.logger.log(`Avatar uploaded successfully for user: ${userId}`);

      return {
        imageUrl: uploadResult.url,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to upload avatar: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Upload challenge image (Admin only)
   */
  async uploadChallengeImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadResponseDto> {
    try {
      this.logger.log(`Uploading challenge image by user: ${userId}`);

      // Generate safe filename
      const fileName = this.s3Service.generateSafeFileName(
        userId,
        file.originalname,
        'challenge',
      );

      // Upload to S3
      const uploadResult: UploadResult = await this.s3Service.uploadFile(file, {
        folder: 'challenges',
        fileName,
        metadata: {
          uploadedBy: userId,
          type: 'challenge-image',
        },
      });

      this.logger.log(`Challenge image uploaded successfully: ${uploadResult.key}`);

      return {
        imageUrl: uploadResult.url,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to upload challenge image: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete file from S3 (for cleanup or admin operations)
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const key = this.s3Service.extractKeyFromUrl(fileUrl);
      if (!key) {
        throw new BadRequestException('Invalid file URL');
      }

      await this.s3Service.deleteFile(key);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate presigned URL for direct client uploads
   */
  async generatePresignedUrl(
    userId: string,
    folder: string,
    filename: string,
    expiresIn: number = 3600,
  ): Promise<{ uploadUrl: string; fileUrl: string }> {
    try {
      const safeFileName = this.s3Service.generateSafeFileName(
        userId,
        filename,
      );
      const key = `${folder}/${userId}/${safeFileName}`;

      const uploadUrl = await this.s3Service.generatePresignedUrl(key, expiresIn);
      const fileUrl = `https://${this.s3Service['bucketName']}.s3.${this.s3Service['region']}.amazonaws.com/${key}`;

      return {
        uploadUrl,
        fileUrl,
      };
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate file exists in S3
   */
  async validateFileExists(fileUrl: string): Promise<boolean> {
    try {
      const key = this.s3Service.extractKeyFromUrl(fileUrl);
      if (!key) {
        return false;
      }

      return await this.s3Service.fileExists(key);
    } catch (error) {
      this.logger.error(`Failed to validate file existence: ${error.message}`);
      return false;
    }
  }
}
