import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeaderboardService } from './leaderboard.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import {
  LeaderboardQueryDto,
  UserRankQueryDto,
} from './dto/leaderboard-query.dto';
import {
  LeaderboardResponseDto,
  UserRankResponseDto,
} from './dto/leaderboard-response.dto';

@ApiTags('leaderboard')
@ApiBearerAuth()
@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get leaderboard data' })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard data retrieved successfully',
    type: ApiResponseDto<LeaderboardResponseDto>,
  })
  async getLeaderboard(
    @Request() req: any,
    @Query(new ValidationPipe({ transform: true })) query: LeaderboardQueryDto,
  ): Promise<ApiResponseDto<LeaderboardResponseDto>> {
    const leaderboard = await this.leaderboardService.getLeaderboard(
      query,
      req.user.id,
    );

    return {
      success: true,
      data: leaderboard,
      message: 'Leaderboard data retrieved successfully',
    };
  }

  @Get('user-rank')
  @ApiOperation({ summary: 'Get user current rank' })
  @ApiResponse({
    status: 200,
    description: 'User rank retrieved successfully',
    type: ApiResponseDto<UserRankResponseDto>,
  })
  async getUserRank(
    @Request() req: any,
    @Query(new ValidationPipe({ transform: true })) query: UserRankQueryDto,
  ): Promise<ApiResponseDto<UserRankResponseDto>> {
    const rank = await this.leaderboardService.getUserRank(req.user.id, query);

    return {
      success: true,
      data: rank,
      message: 'User rank retrieved successfully',
    };
  }
}
