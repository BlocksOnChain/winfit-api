import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsDateString, IsIn, IsNumber, Min, Max } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({ example: '1990-01-01', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ example: 'Male', enum: ['Male', 'Female', 'Other'], required: false })
  @IsOptional()
  @IsIn(['Male', 'Female', 'Other'])
  gender?: string;

  @ApiProperty({ example: 175, minimum: 100, maximum: 250, required: false })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(250)
  heightCm?: number;

  @ApiProperty({ example: 70.5, minimum: 30, maximum: 300, required: false })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(300)
  weightKg?: number;

  @ApiProperty({ example: 10000, minimum: 1000, maximum: 50000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(50000)
  dailyStepGoal?: number;

  @ApiProperty({ example: 70000, minimum: 7000, maximum: 350000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(7000)
  @Max(350000)
  weeklyStepGoal?: number;

  @ApiProperty({ example: 'America/New_York', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;
} 