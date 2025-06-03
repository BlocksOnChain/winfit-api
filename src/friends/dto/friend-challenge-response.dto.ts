import { ApiProperty } from '@nestjs/swagger';
import { FriendChallengeStatus } from '../entities/friend-challenge.entity';
import { FriendUserDto } from './friendship-response.dto';

export class FriendChallengeResponseDto {
  @ApiProperty({
    description: 'Friend challenge ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Challenge goal (steps)',
    example: 50000,
  })
  goal: number;

  @ApiProperty({
    description: 'Challenge duration in days',
    example: 7,
  })
  duration: number;

  @ApiProperty({
    description: 'Challenge start date',
    example: '2024-12-07T00:00:00.000Z',
  })
  startDate: Date;

  @ApiProperty({
    description: 'Challenge end date',
    example: '2024-12-14T00:00:00.000Z',
  })
  endDate: Date;

  @ApiProperty({
    description: 'Challenge status',
    enum: FriendChallengeStatus,
    example: FriendChallengeStatus.ACCEPTED,
  })
  status: FriendChallengeStatus;

  @ApiProperty({
    description: 'User who initiated the challenge',
    type: FriendUserDto,
  })
  challenger: FriendUserDto;

  @ApiProperty({
    description: 'User who was challenged',
    type: FriendUserDto,
  })
  challenged: FriendUserDto;

  @ApiProperty({
    description: 'Winner of the challenge',
    type: FriendUserDto,
    required: false,
  })
  winner?: FriendUserDto;

  @ApiProperty({
    description: 'Challenger progress (steps)',
    example: 25000,
  })
  challengerProgress: number;

  @ApiProperty({
    description: 'Challenged user progress (steps)',
    example: 30000,
  })
  challengedProgress: number;

  @ApiProperty({
    description: 'Challenger progress percentage',
    example: 50.0,
  })
  challengerPercentage: number;

  @ApiProperty({
    description: 'Challenged user progress percentage',
    example: 60.0,
  })
  challengedPercentage: number;

  @ApiProperty({
    description: 'Days remaining in challenge',
    example: 3,
  })
  daysRemaining: number;

  @ApiProperty({
    description: 'Challenge creation date',
    example: '2024-12-06T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Challenge last update date',
    example: '2024-12-06T15:30:00.000Z',
  })
  updatedAt: Date;
}
