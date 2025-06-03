import { ApiProperty } from '@nestjs/swagger';
import { AchievementResponseDto } from './achievement-response.dto';

export class AchievementProgressResponseDto extends AchievementResponseDto {
  @ApiProperty({
    description: 'Whether this achievement is unlocked by the user',
    example: false,
  })
  isUnlocked: boolean;

  @ApiProperty({
    description: 'Progress towards unlocking this achievement (0-1)',
    example: 0.75,
    minimum: 0,
    maximum: 1,
  })
  progress: number;

  @ApiProperty({
    description: 'Current value towards the requirement',
    example: 750,
    required: false,
  })
  currentValue?: number;

  @ApiProperty({
    description: 'When this achievement was unlocked by the user (if unlocked)',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  unlockedAt?: Date;

  @ApiProperty({
    description: 'Human-readable progress description',
    example: '750 / 1,000 steps',
    required: false,
  })
  progressDescription?: string;
}
