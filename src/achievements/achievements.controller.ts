import {
  Controller,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AchievementsService } from './achievements.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { Achievement } from './entities/achievement.entity';

@ApiTags('achievements')
@ApiBearerAuth()
@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user achievements' })
  @ApiResponse({
    status: 200,
    description: 'User achievements retrieved successfully',
  })
  async getUserAchievements(@Request() req: any): Promise<ApiResponseDto<Achievement[]>> {
    const achievements = await this.achievementsService.getUserAchievements(req.user.id);
    return {
      success: true,
      data: achievements,
      message: 'User achievements retrieved successfully',
    };
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available achievements' })
  @ApiResponse({
    status: 200,
    description: 'Available achievements retrieved successfully',
  })
  async getAvailableAchievements(): Promise<ApiResponseDto<Achievement[]>> {
    const achievements = await this.achievementsService.getAvailableAchievements();
    return {
      success: true,
      data: achievements,
      message: 'Available achievements retrieved successfully',
    };
  }
} 