import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsBoolean, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { RewardType } from '../entities/reward.entity';
import { UserRewardStatus } from '../entities/user-reward.entity';

export class RewardQueryDto {
  @ApiProperty({
    description: 'Filter by reward type',
    enum: RewardType,
    required: false,
  })
  @IsOptional()
  @IsEnum(RewardType)
  type?: RewardType;

  @ApiProperty({
    description: 'Filter by reward status',
    enum: UserRewardStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRewardStatus)
  status?: UserRewardStatus;

  @ApiProperty({
    description: 'Filter by purchasable rewards',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isPurchasable?: boolean;

  @ApiProperty({
    description: 'Filter by earnable rewards',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isEarnable?: boolean;

  @ApiProperty({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;

  @ApiProperty({
    description: 'Number of items to skip',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value))
  offset?: number = 0;
} 