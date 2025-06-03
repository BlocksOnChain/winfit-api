import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  Get,
  Query,
  Param,
  Delete,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, UserRole } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UploadsService } from './uploads.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import {
  FileUploadDto,
  UploadResponseDto,
  AvatarUploadResponseDto,
  ChallengeImageUploadResponseDto,
} from './dto/file-upload.dto';
import {
  AvatarValidationPipe,
  ChallengeImageValidationPipe,
} from './pipes/file-validation.pipe';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('avatar')
  @ApiOperation({
    summary: 'Upload user avatar',
    description: 'Upload and update user profile avatar. Maximum file size: 5MB. Supported formats: JPEG, PNG, WebP.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Avatar image file',
    type: FileUploadDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Avatar uploaded successfully',
    type: AvatarUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format, size too large, or missing file',
  })
  @ApiResponse({
    status: 413,
    description: 'File size exceeds maximum allowed size',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile(AvatarValidationPipe) file: Express.Multer.File,
    @Request() req: any,
  ): Promise<ApiResponseDto<UploadResponseDto>> {
    try {
      const result = await this.uploadsService.uploadAvatar(file, req.user.id);
      return {
        success: true,
        data: result,
        message: 'Avatar uploaded successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('challenge-image')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Upload challenge image',
    description: 'Upload challenge image (Admin only). Maximum file size: 10MB. Supported formats: JPEG, PNG, WebP.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Challenge image file',
    type: FileUploadDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Challenge image uploaded successfully',
    type: ChallengeImageUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format, size too large, or missing file',
  })
  @ApiResponse({
    status: 403,
    description: 'Admin access required',
  })
  @ApiResponse({
    status: 413,
    description: 'File size exceeds maximum allowed size',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadChallengeImage(
    @UploadedFile(ChallengeImageValidationPipe) file: Express.Multer.File,
    @Request() req: any,
  ): Promise<ApiResponseDto<UploadResponseDto>> {
    try {
      const result = await this.uploadsService.uploadChallengeImage(
        file,
        req.user.id,
      );
      return {
        success: true,
        data: result,
        message: 'Challenge image uploaded successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('presigned-url')
  @ApiOperation({
    summary: 'Generate presigned URL for direct uploads',
    description: 'Generate a presigned URL for direct client-side uploads to S3.',
  })
  @ApiQuery({
    name: 'folder',
    description: 'Upload folder (e.g., avatars, challenges)',
    example: 'avatars',
  })
  @ApiQuery({
    name: 'filename',
    description: 'Original filename',
    example: 'profile-picture.jpg',
  })
  @ApiQuery({
    name: 'expiresIn',
    description: 'URL expiration time in seconds',
    required: false,
    example: 3600,
  })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL generated successfully',
  })
  async generatePresignedUrl(
    @Query('folder') folder: string,
    @Query('filename') filename: string,
    @Request() req: any,
    @Query('expiresIn') expiresIn?: number,
  ): Promise<ApiResponseDto<{ uploadUrl: string; fileUrl: string }>> {
    if (!folder || !filename) {
      throw new BadRequestException('Folder and filename are required');
    }

    const result = await this.uploadsService.generatePresignedUrl(
      req.user.id,
      folder,
      filename,
      expiresIn ? parseInt(expiresIn.toString()) : 3600,
    );

    return {
      success: true,
      data: result,
      message: 'Presigned URL generated successfully',
    };
  }

  @Get('validate/:fileUrl')
  @ApiOperation({
    summary: 'Validate file exists',
    description: 'Check if a file exists in S3 storage.',
  })
  @ApiResponse({
    status: 200,
    description: 'File validation result',
  })
  async validateFile(
    @Param('fileUrl') fileUrl: string,
  ): Promise<ApiResponseDto<{ exists: boolean }>> {
    const exists = await this.uploadsService.validateFileExists(
      decodeURIComponent(fileUrl),
    );

    return {
      success: true,
      data: { exists },
      message: exists ? 'File exists' : 'File not found',
    };
  }

  @Delete('file')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Delete file',
    description: 'Delete a file from S3 storage. Admin only operation.',
  })
  @ApiQuery({
    name: 'fileUrl',
    description: 'Full URL of the file to delete',
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file URL',
  })
  @ApiResponse({
    status: 403,
    description: 'Admin access required',
  })
  async deleteFile(
    @Query('fileUrl') fileUrl: string,
  ): Promise<ApiResponseDto<null>> {
    if (!fileUrl) {
      throw new BadRequestException('File URL is required');
    }

    await this.uploadsService.deleteFile(decodeURIComponent(fileUrl));

    return {
      success: true,
      data: null,
      message: 'File deleted successfully',
    };
  }
}
