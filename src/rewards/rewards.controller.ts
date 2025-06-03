import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RewardsService } from './rewards.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';

@ApiTags('rewards')
@ApiBearerAuth()
@Controller('rewards')
@UseGuards(JwtAuthGuard)
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user rewards' })
  @ApiQuery({ name: 'type', required: false, enum: ['Coupon', 'Badge', 'Points'] })
  @ApiQuery({ name: 'status', required: false, enum: ['available', 'redeemed', 'expired'] })
  @ApiResponse({
    status: 200,
    description: 'Rewards retrieved successfully',
  })
  async getRewards(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any[]>> {
    const rewards = await this.rewardsService.getUserRewards(req.user.id, { type, status });
    return {
      success: true,
      data: rewards,
      message: 'Rewards retrieved successfully',
    };
  }

  @Post(':id/redeem')
  @ApiOperation({ summary: 'Redeem a reward' })
  @ApiResponse({
    status: 200,
    description: 'Reward redeemed successfully',
  })
  async redeemReward(
    @Param('id') rewardId: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.rewardsService.redeemReward(rewardId, req.user.id);
    return {
      success: true,
      data: result,
      message: 'Reward redeemed successfully',
    };
  }

  @Get('points')
  @ApiOperation({ summary: 'Get user points balance' })
  @ApiResponse({
    status: 200,
    description: 'Points balance retrieved successfully',
  })
  async getPointsBalance(@Request() req: any): Promise<ApiResponseDto<any>> {
    const balance = await this.rewardsService.getPointsBalance(req.user.id);
    return {
      success: true,
      data: balance,
      message: 'Points balance retrieved successfully',
    };
  }
} 