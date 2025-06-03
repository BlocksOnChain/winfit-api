import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RewardsService } from './rewards.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { RewardQueryDto } from './dto/reward-query.dto';
import { PurchaseRewardDto } from './dto/purchase-reward.dto';
import {
  RewardListResponseDto,
  PointsBalanceDto,
  RedeemRewardResponseDto,
  RewardDto,
} from './dto/reward-response.dto';
import { RewardType } from './entities/reward.entity';
import { UserRewardStatus } from './entities/user-reward.entity';

@ApiTags('rewards')
@ApiBearerAuth()
@Controller('rewards')
@UseGuards(JwtAuthGuard)
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user rewards' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: RewardType,
    description: 'Filter by reward type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: UserRewardStatus,
    description: 'Filter by reward status',
  })
  @ApiQuery({
    name: 'isPurchasable',
    required: false,
    type: Boolean,
    description: 'Filter by purchasable rewards',
  })
  @ApiQuery({
    name: 'isEarnable',
    required: false,
    type: Boolean,
    description: 'Filter by earnable rewards',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of items to skip',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Rewards retrieved successfully',
    type: RewardListResponseDto,
  })
  async getRewards(
    @Query() query: RewardQueryDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<RewardListResponseDto>> {
    const rewards = await this.rewardsService.getUserRewards(req.user.id, query);
    return {
      success: true,
      data: rewards,
      message: 'Rewards retrieved successfully',
    };
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available rewards for purchase' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: RewardType,
    description: 'Filter by reward type',
  })
  @ApiQuery({
    name: 'isPurchasable',
    required: false,
    type: Boolean,
    description: 'Filter by purchasable rewards',
  })
  @ApiQuery({
    name: 'isEarnable',
    required: false,
    type: Boolean,
    description: 'Filter by earnable rewards',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of items to skip',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Available rewards retrieved successfully',
    type: [RewardDto],
  })
  async getAvailableRewards(
    @Query() query: RewardQueryDto,
  ): Promise<ApiResponseDto<RewardDto[]>> {
    const rewards = await this.rewardsService.getAvailableRewards(query);
    return {
      success: true,
      data: rewards,
      message: 'Available rewards retrieved successfully',
    };
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Purchase a reward with points' })
  @ApiBody({ type: PurchaseRewardDto })
  @ApiResponse({
    status: 200,
    description: 'Reward purchased successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - insufficient points or reward not available',
  })
  @ApiResponse({
    status: 404,
    description: 'Reward not found',
  })
  async purchaseReward(
    @Body() purchaseDto: PurchaseRewardDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const userReward = await this.rewardsService.purchaseReward(
      req.user.id,
      purchaseDto.rewardId,
    );
    return {
      success: true,
      data: userReward,
      message: 'Reward purchased successfully',
    };
  }

  @Post(':id/redeem')
  @ApiOperation({ summary: 'Redeem a reward' })
  @ApiResponse({
    status: 200,
    description: 'Reward redeemed successfully',
    type: RedeemRewardResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - reward already redeemed or expired',
  })
  @ApiResponse({
    status: 404,
    description: 'Reward not found',
  })
  async redeemReward(
    @Param('id', ParseUUIDPipe) rewardId: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<RedeemRewardResponseDto>> {
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
    type: PointsBalanceDto,
  })
  async getPointsBalance(@Request() req: any): Promise<ApiResponseDto<PointsBalanceDto>> {
    const balance = await this.rewardsService.getPointsBalance(req.user.id);
    return {
      success: true,
      data: balance,
      message: 'Points balance retrieved successfully',
    };
  }
}
