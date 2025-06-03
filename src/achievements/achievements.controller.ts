import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  UseGuards,
  Request,
  Query,
  Param,
  Body,
  ValidationPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AchievementsService } from './achievements.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { AchievementResponseDto } from './dto/achievement-response.dto';
import { UserAchievementResponseDto } from './dto/user-achievement-response.dto';
import { AchievementProgressResponseDto } from './dto/achievement-progress-response.dto';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { AchievementQueryDto } from './dto/achievement-query.dto';
import { AchievementCategory } from './entities/achievement.entity';

@ApiTags('achievements')
@ApiBearerAuth()
@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user achievements',
    description:
      'Get all achievements unlocked by the current user with optional filtering',
  })
  @ApiQuery({ name: 'category', enum: AchievementCategory, required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiResponse({
    status: 200,
    description: 'User achievements retrieved successfully',
    type: [UserAchievementResponseDto],
  })
  async getUserAchievements(
    @Request() req: any,
    @Query(ValidationPipe) query: AchievementQueryDto,
  ): Promise<ApiResponseDto<UserAchievementResponseDto[]>> {
    const achievements = await this.achievementsService.getUserAchievements(
      req.user.id,
      query,
    );
    return {
      success: true,
      data: achievements,
      message: 'User achievements retrieved successfully',
    };
  }

  @Get('available')
  @ApiOperation({
    summary: 'Get available achievements',
    description:
      'Get all available achievements in the system with optional filtering',
  })
  @ApiQuery({ name: 'category', enum: AchievementCategory, required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiResponse({
    status: 200,
    description: 'Available achievements retrieved successfully',
    type: [AchievementResponseDto],
  })
  async getAvailableAchievements(
    @Query(ValidationPipe) query: AchievementQueryDto,
  ): Promise<ApiResponseDto<AchievementResponseDto[]>> {
    const achievements =
      await this.achievementsService.getAvailableAchievements(query);
    return {
      success: true,
      data: achievements,
      message: 'Available achievements retrieved successfully',
    };
  }

  @Get('progress')
  @ApiOperation({
    summary: 'Get user achievement progress',
    description:
      'Get progress towards all achievements including unlocked status and completion percentage',
  })
  @ApiQuery({ name: 'category', enum: AchievementCategory, required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiQuery({ name: 'unlockedOnly', type: Boolean, required: false })
  @ApiQuery({ name: 'lockedOnly', type: Boolean, required: false })
  @ApiResponse({
    status: 200,
    description: 'User achievement progress retrieved successfully',
    type: [AchievementProgressResponseDto],
  })
  async getUserAchievementProgress(
    @Request() req: any,
    @Query(ValidationPipe) query: AchievementQueryDto,
  ): Promise<ApiResponseDto<AchievementProgressResponseDto[]>> {
    const progress = await this.achievementsService.getUserAchievementProgress(
      req.user.id,
      query,
    );
    return {
      success: true,
      data: progress,
      message: 'User achievement progress retrieved successfully',
    };
  }

  @Post('admin/create')
  @ApiOperation({
    summary: 'Create new achievement (Admin only)',
    description: 'Create a new achievement in the system',
  })
  @ApiResponse({
    status: 201,
    description: 'Achievement created successfully',
    type: AchievementResponseDto,
  })
  async createAchievement(
    @Body(ValidationPipe) createAchievementDto: CreateAchievementDto,
  ): Promise<ApiResponseDto<AchievementResponseDto>> {
    const achievement =
      await this.achievementsService.createAchievement(createAchievementDto);
    return {
      success: true,
      data: achievement,
      message: 'Achievement created successfully',
    };
  }

  @Put('admin/:id')
  @ApiOperation({
    summary: 'Update achievement (Admin only)',
    description: 'Update an existing achievement',
  })
  @ApiParam({ name: 'id', description: 'Achievement ID' })
  @ApiResponse({
    status: 200,
    description: 'Achievement updated successfully',
    type: AchievementResponseDto,
  })
  async updateAchievement(
    @Param('id') id: string,
    @Body(ValidationPipe) updateData: Partial<CreateAchievementDto>,
  ): Promise<ApiResponseDto<AchievementResponseDto>> {
    const achievement = await this.achievementsService.updateAchievement(
      id,
      updateData,
    );
    return {
      success: true,
      data: achievement,
      message: 'Achievement updated successfully',
    };
  }

  @Delete('admin/:id')
  @ApiOperation({
    summary: 'Delete achievement (Admin only)',
    description: 'Delete an achievement from the system',
  })
  @ApiParam({ name: 'id', description: 'Achievement ID' })
  @ApiResponse({
    status: 200,
    description: 'Achievement deleted successfully',
  })
  async deleteAchievement(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<null>> {
    await this.achievementsService.deleteAchievement(id);
    return {
      success: true,
      data: null,
      message: 'Achievement deleted successfully',
    };
  }

  @Post('admin/seed')
  @ApiOperation({
    summary: 'Seed initial achievements (Admin only)',
    description: 'Seed the system with initial achievements if none exist',
  })
  @ApiResponse({
    status: 200,
    description: 'Initial achievements seeded successfully',
  })
  async seedInitialAchievements(): Promise<ApiResponseDto<null>> {
    await this.achievementsService.seedInitialAchievements();
    return {
      success: true,
      data: null,
      message: 'Initial achievements seeded successfully',
    };
  }
}
