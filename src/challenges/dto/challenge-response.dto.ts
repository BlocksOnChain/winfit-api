import { ApiProperty } from '@nestjs/swagger';
import {
  ChallengeType,
  ChallengeCategory,
  ChallengeDifficulty,
  RewardType,
} from '../entities/challenge.entity';

export class ChallengeUserDto {
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

export class ChallengeLeaderboardEntryDto {
  @ApiProperty()
  rank: number;

  @ApiProperty()
  user: ChallengeUserDto;

  @ApiProperty()
  progress: number;

  @ApiProperty()
  percentage: number;
}

export class ChallengeProgressDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  currentProgress: number;

  @ApiProperty()
  completionPercentage: number;

  @ApiProperty()
  isCompleted: boolean;

  @ApiProperty()
  joinedAt: Date;

  @ApiProperty({ required: false })
  completedAt?: Date;

  @ApiProperty({ required: false })
  rank?: number;

  @ApiProperty()
  pointsEarned: number;
}

export class ChallengeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ enum: ChallengeType })
  type: ChallengeType;

  @ApiProperty({ enum: ChallengeCategory })
  category: ChallengeCategory;

  @ApiProperty()
  goal: number;

  @ApiProperty()
  duration: number;

  @ApiProperty({ enum: ChallengeDifficulty })
  difficulty: ChallengeDifficulty;

  @ApiProperty({ required: false })
  maxParticipants?: number;

  @ApiProperty({ enum: RewardType, required: false })
  rewardType?: RewardType;

  @ApiProperty({ required: false })
  rewardValue?: string;

  @ApiProperty({ required: false })
  rewardDescription?: string;

  @ApiProperty({ required: false })
  rewardImageUrl?: string;

  @ApiProperty({ required: false })
  challengeImageUrl?: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ChallengeDetailDto extends ChallengeDto {
  @ApiProperty()
  participants: number;

  @ApiProperty({ required: false })
  userProgress?: ChallengeProgressDto;

  @ApiProperty({ type: [ChallengeLeaderboardEntryDto] })
  leaderboard: ChallengeLeaderboardEntryDto[];
}

export class ChallengeListResponseDto {
  @ApiProperty({ type: [ChallengeDto] })
  challenges: ChallengeDto[];

  @ApiProperty()
  total: number;
}

export class UserChallengeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  currentProgress: number;

  @ApiProperty()
  completionPercentage: number;

  @ApiProperty()
  isCompleted: boolean;

  @ApiProperty()
  joinedAt: Date;

  @ApiProperty({ required: false })
  completedAt?: Date;

  @ApiProperty({ required: false })
  rank?: number;

  @ApiProperty()
  pointsEarned: number;

  @ApiProperty()
  challenge: ChallengeDto;
}
