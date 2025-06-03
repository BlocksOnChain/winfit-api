import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

export class SyncHealthDataDto {
  @ApiProperty({
    description: 'Date for the health data entry',
    example: '2024-12-06',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Number of steps taken',
    example: 8500,
  })
  @IsNumber()
  @Min(0)
  steps: number;

  @ApiProperty({
    description: 'Distance covered in meters',
    example: 6800,
  })
  @IsNumber()
  @Min(0)
  distance: number;

  @ApiProperty({
    description: 'Calories burned',
    example: 320,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  caloriesBurned?: number;

  @ApiProperty({
    description: 'Active minutes',
    example: 45,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  activeMinutes?: number;

  @ApiProperty({
    description: 'Floors climbed',
    example: 12,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  floorsClimbed?: number;

  @ApiProperty({
    description: 'Average heart rate',
    example: 78,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  heartRateAvg?: number;

  @ApiProperty({
    description: 'Hours of sleep',
    example: 7.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sleepHours?: number;

  @ApiProperty({
    description: 'Water intake in milliliters',
    example: 2000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  waterIntakeMl?: number;
} 