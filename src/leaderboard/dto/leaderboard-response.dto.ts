import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;
}

export class LeaderboardEntryDto {
  @ApiProperty()
  rank: number;

  @ApiProperty()
  user: LeaderboardUserDto;

  @ApiProperty({ description: 'Score (steps, distance, points, etc.)' })
  score: number;

  @ApiProperty({
    required: false,
    description: 'Position change from previous period',
  })
  change?: number;

  @ApiProperty({
    required: false,
    description: 'Progress percentage for challenges',
  })
  percentage?: number;
}

export class LeaderboardResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  period: string;

  @ApiProperty({ type: [LeaderboardEntryDto] })
  entries: LeaderboardEntryDto[];

  @ApiProperty({
    required: false,
    description: 'Current user rank in this leaderboard',
  })
  userRank?: number;

  @ApiProperty()
  totalParticipants: number;

  @ApiProperty()
  lastUpdated: string;
}

export class UserRankResponseDto {
  @ApiProperty({ description: 'User current rank', required: false })
  rank: number | null;

  @ApiProperty()
  totalParticipants: number;

  @ApiProperty()
  score: number;

  @ApiProperty({ description: 'Position change from previous period' })
  change: number;

  @ApiProperty({ required: false })
  period?: string;

  @ApiProperty({ required: false })
  previousRank?: number;
}
