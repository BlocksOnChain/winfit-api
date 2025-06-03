import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HealthService } from './health.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { HealthData } from './entities/health-data.entity';
import { SyncHealthDataDto } from './dto/sync-health-data.dto';

@ApiTags('health')
@ApiBearerAuth()
@Controller('health')
@UseGuards(JwtAuthGuard)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Post('sync')
  @ApiOperation({ summary: 'Sync health data from device' })
  @ApiResponse({
    status: 201,
    description: 'Health data synced successfully',
  })
  async syncHealthData(
    @Body() syncHealthDataDto: SyncHealthDataDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<HealthData>> {
    const healthData = await this.healthService.syncHealthData(req.user.id, syncHealthDataDto);
    return {
      success: true,
      data: healthData,
      message: 'Health data synced successfully',
    };
  }

  @Get('data')
  @ApiOperation({ summary: 'Get health data for a period' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'aggregation', required: false, enum: ['daily', 'weekly', 'monthly'] })
  @ApiResponse({
    status: 200,
    description: 'Health data retrieved successfully',
  })
  async getHealthData(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('aggregation') aggregation = 'daily',
    @Request() req: any,
  ): Promise<ApiResponseDto<HealthData[]>> {
    const healthData = await this.healthService.getHealthData(
      req.user.id,
      startDate,
      endDate,
      aggregation,
    );
    return {
      success: true,
      data: healthData,
      message: 'Health data retrieved successfully',
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get health summary statistics' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'year'], description: 'Summary period' })
  @ApiResponse({
    status: 200,
    description: 'Health summary retrieved successfully',
  })
  async getHealthSummary(
    @Query('period') period = 'week',
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const summary = await this.healthService.getHealthSummary(req.user.id, period);
    return {
      success: true,
      data: summary,
      message: 'Health summary retrieved successfully',
    };
  }

  @Get('daily-goals')
  @ApiOperation({ summary: 'Get daily goal progress' })
  @ApiResponse({
    status: 200,
    description: 'Daily goal progress retrieved successfully',
  })
  async getDailyGoalProgress(@Request() req: any): Promise<ApiResponseDto<any>> {
    const progress = await this.healthService.getDailyGoalProgress(req.user.id);
    return {
      success: true,
      data: progress,
      message: 'Daily goal progress retrieved successfully',
    };
  }
} 