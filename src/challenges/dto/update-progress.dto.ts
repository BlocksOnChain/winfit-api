import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsDateString, IsPositive } from 'class-validator';

export class UpdateProgressDto {
  @ApiProperty({
    description: 'Progress value (steps, distance in meters, etc.)',
    example: 5000,
  })
  @IsNumber()
  @IsPositive()
  progress: number;

  @ApiProperty({
    description: 'Date for the progress entry',
    example: '2024-12-06',
  })
  @IsDateString()
  date: string;
} 