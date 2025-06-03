import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HealthService } from './health.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import {
  SyncHealthDataDto,
  BatchSyncHealthDataDto,
} from './dto/sync-health-data.dto';
import { HealthQueryDto } from './dto/health-query.dto';
import {
  HealthSummaryQueryDto,
  HealthSummaryPeriod,
} from './dto/health-query.dto';
import { HealthDataResponseDto } from './dto/health-data-response.dto';
import { HealthSummaryResponseDto } from './dto/health-summary-response.dto';
import { DailyGoalResponseDto } from './dto/daily-goal-response.dto';

@ApiTags('Health Data')
@Controller('health')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync health data',
    description:
      'Sync daily health data from mobile device. Automatically updates challenge progress for all active challenges.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health data synced successfully',
    type: ApiResponseDto<HealthDataResponseDto>,
  })
  async syncHealthData(
    @Body(ValidationPipe) syncHealthDataDto: SyncHealthDataDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<HealthDataResponseDto>> {
    const data = await this.healthService.syncHealthData(
      req.user.id,
      syncHealthDataDto,
    );
    return {
      success: true,
      data,
      message: 'Health data synced successfully',
    };
  }

  @Post('sync/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Batch sync health data',
    description:
      'Sync multiple days of health data in a single request. Useful for initial setup or catching up missed days.',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch health data synced successfully',
  })
  async batchSyncHealthData(
    @Body(ValidationPipe) batchSyncDto: BatchSyncHealthDataDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.healthService.batchSyncHealthData(
      req.user.id,
      batchSyncDto,
    );
    return {
      success: true,
      data: result,
      message: `Synced ${result.synced} entries with ${result.errors.length} errors`,
    };
  }

  @Post('sync/smart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Smart sync health data',
    description:
      'Intelligent health data sync that handles data gaps and optimizes challenge progress tracking.',
  })
  @ApiResponse({
    status: 200,
    description: 'Smart health data sync completed',
  })
  async smartSyncHealthData(
    @Body(ValidationPipe) syncHealthDataDto: SyncHealthDataDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.healthService.smartSyncHealthData(
      req.user.id,
      syncHealthDataDto,
    );
    return {
      success: true,
      data: result,
      message: 'Smart sync completed successfully',
    };
  }

  @Get('data')
  @ApiOperation({
    summary: 'Get health data for a period',
    description:
      'Retrieve health data for a specified date range with optional aggregation (daily, weekly, monthly).',
  })
  @ApiResponse({
    status: 200,
    description: 'Health data retrieved successfully',
    type: [HealthDataResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid date range or aggregation type',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getHealthData(
    @Query(ValidationPipe) query: HealthQueryDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<HealthDataResponseDto[]>> {
    const healthData = await this.healthService.getHealthData(
      req.user.id,
      query,
    );
    return {
      success: true,
      data: healthData,
      message: 'Health data retrieved successfully',
    };
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get comprehensive health summary',
    description:
      'Get detailed health analytics including trends, streaks, goals, and comprehensive statistics for the specified period.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health summary retrieved successfully',
    type: HealthSummaryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid period specified',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getHealthSummary(
    @Query(ValidationPipe) query: HealthSummaryQueryDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<HealthSummaryResponseDto>> {
    const summary = await this.healthService.getHealthSummary(
      req.user.id,
      query,
    );
    return {
      success: true,
      data: summary,
      message: 'Health summary retrieved successfully',
    };
  }

  @Get('daily-goals')
  @ApiOperation({
    summary: 'Get daily goal progress',
    description:
      'Get real-time progress towards daily goals including step count, remaining steps, streak information, and performance insights.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily goal progress retrieved successfully',
    type: DailyGoalResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async getDailyGoalProgress(
    @Request() req: any,
  ): Promise<ApiResponseDto<DailyGoalResponseDto>> {
    const progress = await this.healthService.getDailyGoalProgress(req.user.id);
    return {
      success: true,
      data: progress,
      message: 'Daily goal progress retrieved successfully',
    };
  }
}
