import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum LeaderboardType {
  GLOBAL = 'global',
  FRIENDS = 'friends',
  CHALLENGE = 'challenge',
}

export enum LeaderboardPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ALL_TIME = 'alltime',
}

export class LeaderboardQueryDto {
  @ApiProperty({
    enum: LeaderboardType,
    default: LeaderboardType.GLOBAL,
    required: false,
  })
  @IsOptional()
  @IsEnum(LeaderboardType)
  type?: LeaderboardType = LeaderboardType.GLOBAL;

  @ApiProperty({
    enum: LeaderboardPeriod,
    default: LeaderboardPeriod.WEEKLY,
    required: false,
  })
  @IsOptional()
  @IsEnum(LeaderboardPeriod)
  period?: LeaderboardPeriod = LeaderboardPeriod.WEEKLY;

  @ApiProperty({
    required: false,
    description: 'Required when type is Challenge',
  })
  @IsOptional()
  @IsString()
  challengeId?: string;

  @ApiProperty({ default: 50, minimum: 1, maximum: 100, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class UserRankQueryDto {
  @ApiProperty({
    enum: [LeaderboardType.GLOBAL, LeaderboardType.FRIENDS],
    default: LeaderboardType.GLOBAL,
    required: false,
  })
  @IsOptional()
  @IsEnum([LeaderboardType.GLOBAL, LeaderboardType.FRIENDS])
  type?: LeaderboardType.GLOBAL | LeaderboardType.FRIENDS =
    LeaderboardType.GLOBAL;

  @ApiProperty({
    enum: [
      LeaderboardPeriod.DAILY,
      LeaderboardPeriod.WEEKLY,
      LeaderboardPeriod.MONTHLY,
    ],
    default: LeaderboardPeriod.WEEKLY,
    required: false,
  })
  @IsOptional()
  @IsEnum([
    LeaderboardPeriod.DAILY,
    LeaderboardPeriod.WEEKLY,
    LeaderboardPeriod.MONTHLY,
  ])
  period?:
    | LeaderboardPeriod.DAILY
    | LeaderboardPeriod.WEEKLY
    | LeaderboardPeriod.MONTHLY = LeaderboardPeriod.WEEKLY;
}
