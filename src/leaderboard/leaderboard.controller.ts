import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeaderboardService } from './leaderboard.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';

@ApiTags('leaderboard')
@ApiBearerAuth()
@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get leaderboard data' })
  @ApiQuery({ name: 'type', required: false, enum: ['Global', 'Friends', 'Challenge'] })
  @ApiQuery({ name: 'period', required: false, enum: ['Daily', 'Weekly', 'Monthly', 'AllTime'] })
  @ApiQuery({ name: 'challengeId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard data retrieved successfully',
  })
  async getLeaderboard(
    @Request() req: any,
    @Query('type') type = 'Global',
    @Query('period') period = 'Weekly',
    @Query('challengeId') challengeId?: string,
    @Query('limit') limit = 50,
  ): Promise<ApiResponseDto<any>> {
    const leaderboard = await this.leaderboardService.getLeaderboard({
      type,
      period,
      challengeId,
      limit: Number(limit),
      userId: req.user.id,
    });

    return {
      success: true,
      data: leaderboard,
      message: 'Leaderboard data retrieved successfully',
    };
  }

  @Get('user-rank')
  @ApiOperation({ summary: 'Get user current rank' })
  @ApiQuery({ name: 'type', required: false, enum: ['Global', 'Friends'] })
  @ApiQuery({ name: 'period', required: false, enum: ['Daily', 'Weekly', 'Monthly'] })
  @ApiResponse({
    status: 200,
    description: 'User rank retrieved successfully',
  })
  async getUserRank(
    @Query('type') type = 'Global',
    @Query('period') period = 'Weekly',
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const rank = await this.leaderboardService.getUserRank(req.user.id, type, period);
    return {
      success: true,
      data: rank,
      message: 'User rank retrieved successfully',
    };
  }
} 