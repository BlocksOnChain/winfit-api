import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum HealthDataSource {
  APPLE_HEALTH = 'apple_health',
  GOOGLE_FIT = 'google_fit',
  FITBIT = 'fitbit',
  MANUAL = 'manual',
  DEVICE = 'device',
}

export class SyncHealthDataDto {
  @ApiProperty({
    example: '2024-12-06',
    description: 'Date for the health data in ISO format (YYYY-MM-DD). Must be today or in the past.',
    type: String,
    format: 'date',
    required: true,
  })
  @IsDateString({}, { message: 'Date must be in valid ISO format (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({
    example: 8547,
    description: 'Total steps taken on this date. Automatically updates challenge progress.',
    minimum: 0,
    maximum: 100000,
    type: Number,
    required: true,
  })
  @IsNumber({}, { message: 'Steps must be a valid number' })
  @Min(0, { message: 'Steps cannot be negative' })
  @Max(100000, { message: 'Steps cannot exceed 100,000 per day' })
  steps: number;

  @ApiProperty({
    example: 5982,
    description: 'Distance traveled in meters. Used for distance-based challenges.',
    minimum: 0,
    maximum: 200000,
    type: Number,
    required: true,
  })
  @IsNumber({}, { message: 'Distance must be a valid number' })
  @Min(0, { message: 'Distance cannot be negative' })
  @Max(200000, { message: 'Distance cannot exceed 200,000 meters per day' })
  distance: number;

  @ApiProperty({
    example: 342,
    description: 'Calories burned during the day. Used for calorie tracking and achievements.',
    minimum: 0,
    maximum: 10000,
    type: Number,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Calories burned must be a valid number' })
  @Min(0, { message: 'Calories burned cannot be negative' })
  @Max(10000, { message: 'Calories burned cannot exceed 10,000 per day' })
  caloriesBurned?: number;

  @ApiProperty({
    example: 45,
    description: 'Active minutes during the day. Counts towards activity-based achievements.',
    minimum: 0,
    maximum: 1440,
    type: Number,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Active minutes must be a valid number' })
  @Min(0, { message: 'Active minutes cannot be negative' })
  @Max(1440, { message: 'Active minutes cannot exceed 1440 (24 hours)' })
  activeMinutes?: number;

  @ApiProperty({
    example: 12,
    description: 'Number of floors climbed. Used for elevation-based challenges.',
    minimum: 0,
    maximum: 1000,
    type: Number,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Floors climbed must be a valid number' })
  @Min(0, { message: 'Floors climbed cannot be negative' })
  @Max(1000, { message: 'Floors climbed cannot exceed 1000 per day' })
  floorsClimbed?: number;

  @ApiProperty({
    example: 72,
    description: 'Average heart rate in beats per minute. Used for health monitoring.',
    minimum: 30,
    maximum: 220,
    type: Number,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Heart rate must be a valid number' })
  @Min(30, { message: 'Heart rate must be at least 30 bpm' })
  @Max(220, { message: 'Heart rate cannot exceed 220 bpm' })
  heartRateAvg?: number;

  @ApiProperty({
    example: 7.5,
    description: 'Hours of sleep. Used for sleep tracking and wellness achievements.',
    minimum: 0,
    maximum: 24,
    type: Number,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Sleep hours must be a valid number' })
  @Min(0, { message: 'Sleep hours cannot be negative' })
  @Max(24, { message: 'Sleep hours cannot exceed 24' })
  sleepHours?: number;

  @ApiProperty({
    example: 2500,
    description: 'Water intake in milliliters. Used for hydration tracking.',
    minimum: 0,
    maximum: 10000,
    type: Number,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Water intake must be a valid number' })
  @Min(0, { message: 'Water intake cannot be negative' })
  @Max(10000, { message: 'Water intake cannot exceed 10,000ml per day' })
  waterIntakeMl?: number;

  @ApiPropertyOptional({
    description: 'Source of the health data',
    enum: HealthDataSource,
    example: HealthDataSource.APPLE_HEALTH,
  })
  @IsOptional()
  @IsEnum(HealthDataSource)
  source?: HealthDataSource;

  @ApiPropertyOptional({
    description: 'Device or app version that recorded the data',
    example: 'iOS 17.1',
  })
  @IsOptional()
  @IsString()
  deviceVersion?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when data was recorded on the device',
    example: '2024-01-15T18:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}

export class BatchSyncHealthDataDto {
  @ApiProperty({
    description: 'Array of health data entries for multiple days. Maximum 30 entries per batch.',
    type: [SyncHealthDataDto],
    isArray: true,
    minItems: 1,
    maxItems: 30,
    required: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncHealthDataDto)
  healthData: SyncHealthDataDto[];

  @ApiPropertyOptional({
    description:
      'Whether this is a retroactive sync (for handling baseline recalculations)',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isRetroactive?: boolean;

  @ApiPropertyOptional({
    description: 'Sync session ID for tracking and deduplication',
    example: 'sync_123456789',
  })
  @IsOptional()
  @IsString()
  syncSessionId?: string;
}
