import { ApiProperty } from '@nestjs/swagger';
import { RewardType, RewardStatus } from '../entities/reward.entity';
import { UserRewardStatus, AcquisitionType } from '../entities/user-reward.entity';

export class RewardDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: RewardType })
  type: RewardType;

  @ApiProperty()
  value: string;

  @ApiProperty({ required: false })
  imageUrl?: string;

  @ApiProperty({ required: false })
  iconUrl?: string;

  @ApiProperty({ enum: RewardStatus })
  status: RewardStatus;

  @ApiProperty()
  pointsCost: number;

  @ApiProperty()
  isPurchasable: boolean;

  @ApiProperty()
  isEarnable: boolean;

  @ApiProperty({ required: false })
  maxRedemptions?: number;

  @ApiProperty()
  currentRedemptions: number;

  @ApiProperty({ required: false })
  expiryDate?: Date;

  @ApiProperty({ required: false })
  termsConditions?: string;

  @ApiProperty({ required: false })
  redemptionInstructions?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class UserRewardDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  rewardId: string;

  @ApiProperty({ enum: UserRewardStatus })
  status: UserRewardStatus;

  @ApiProperty({ enum: AcquisitionType })
  acquisitionType: AcquisitionType;

  @ApiProperty()
  pointsSpent: number;

  @ApiProperty({ required: false })
  earnedFrom?: string;

  @ApiProperty({ required: false })
  earnedReason?: string;

  @ApiProperty({ required: false })
  redeemCode?: string;

  @ApiProperty({ required: false })
  redemptionData?: any;

  @ApiProperty()
  earnedAt: Date;

  @ApiProperty({ required: false })
  redeemedAt?: Date;

  @ApiProperty({ required: false })
  expiresAt?: Date;

  @ApiProperty({ type: RewardDto })
  reward: RewardDto;
}

export class UserRewardWithDetailsDto extends UserRewardDto {
  @ApiProperty()
  daysUntilExpiry?: number;

  @ApiProperty()
  canRedeem: boolean;

  @ApiProperty()
  isExpired: boolean;
}

export class PointsBalanceDto {
  @ApiProperty()
  totalPoints: number;

  @ApiProperty()
  availablePoints: number;

  @ApiProperty()
  lifetimeEarned: number;

  @ApiProperty()
  lifetimeSpent: number;

  @ApiProperty()
  level: number;

  @ApiProperty()
  pointsToNextLevel: number;
}

export class RedeemRewardResponseDto {
  @ApiProperty({ required: false })
  redeemCode?: string;

  @ApiProperty()
  instructions: string;

  @ApiProperty()
  redemptionData?: any;

  @ApiProperty()
  redeemedAt: Date;
}

export class RewardListResponseDto {
  @ApiProperty({ type: [UserRewardWithDetailsDto] })
  rewards: UserRewardWithDetailsDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  offset: number;

  @ApiProperty()
  hasMore: boolean;
} 