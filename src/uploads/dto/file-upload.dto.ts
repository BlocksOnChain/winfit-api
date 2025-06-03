import { ApiProperty } from '@nestjs/swagger';

export class FileUploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'The file to upload',
  })
  file: Express.Multer.File;
}

export class UploadResponseDto {
  @ApiProperty({
    description: 'The URL of the uploaded file',
    example: 'https://winfit-uploads.s3.amazonaws.com/avatars/user-123/avatar-1638360000000.jpg',
  })
  imageUrl: string;

  @ApiProperty({
    description: 'The original filename',
    example: 'profile-picture.jpg',
  })
  originalName: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 2048576,
  })
  size: number;

  @ApiProperty({
    description: 'MIME type of the uploaded file',
    example: 'image/jpeg',
  })
  mimeType: string;
}

export class AvatarUploadResponseDto {
  @ApiProperty({ description: 'Upload success status' })
  success: boolean;

  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ type: UploadResponseDto })
  data: UploadResponseDto;
}

export class ChallengeImageUploadResponseDto {
  @ApiProperty({ description: 'Upload success status' })
  success: boolean;

  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ type: UploadResponseDto })
  data: UploadResponseDto;
} 