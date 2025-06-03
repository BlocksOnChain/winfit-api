import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsNumber,
  IsPositive,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFriendChallengeDto {
  @ApiProperty({
    description: 'The ID of the friend to challenge',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  friendId: string;

  @ApiProperty({
    description: 'The goal for the challenge (steps)',
    example: 50000,
    minimum: 1000,
    maximum: 1000000,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(1000)
  @Max(1000000)
  goal: number;

  @ApiProperty({
    description: 'Duration of the challenge in days',
    example: 7,
    minimum: 1,
    maximum: 30,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(30)
  duration: number;

  @ApiProperty({
    description: 'Start date of the challenge',
    example: '2024-12-07T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;
}
