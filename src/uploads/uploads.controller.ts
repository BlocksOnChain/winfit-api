import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Avatar uploaded successfully',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ): Promise<ApiResponseDto<{ imageUrl: string }>> {
    const result = await this.uploadsService.uploadAvatar(file, req.user.id);
    return {
      success: true,
      data: result,
      message: 'Avatar uploaded successfully',
    };
  }

  @Post('challenge-image')
  @ApiOperation({ summary: 'Upload challenge image (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Challenge image uploaded successfully',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadChallengeImage(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ): Promise<ApiResponseDto<{ imageUrl: string }>> {
    const result = await this.uploadsService.uploadChallengeImage(file, req.user.id);
    return {
      success: true,
      data: result,
      message: 'Challenge image uploaded successfully',
    };
  }
} 