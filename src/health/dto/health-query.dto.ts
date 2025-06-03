import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export enum HealthAggregationType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum HealthSummaryPeriod {
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class HealthQueryDto {
  @ApiProperty({
    description: 'Start date for health data query',
    example: '2024-12-01',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date for health data query',
    example: '2024-12-06',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Data aggregation type',
    enum: HealthAggregationType,
    default: HealthAggregationType.DAILY,
    required: false,
  })
  @IsOptional()
  @IsEnum(HealthAggregationType)
  @Transform(({ value }) => value || HealthAggregationType.DAILY)
  aggregation?: HealthAggregationType = HealthAggregationType.DAILY;
}

export class HealthSummaryQueryDto {
  @ApiProperty({
    description: 'Summary period',
    enum: HealthSummaryPeriod,
    default: HealthSummaryPeriod.WEEK,
    required: false,
  })
  @IsOptional()
  @IsEnum(HealthSummaryPeriod)
  @Transform(({ value }) => value || HealthSummaryPeriod.WEEK)
  period?: HealthSummaryPeriod = HealthSummaryPeriod.WEEK;
}
