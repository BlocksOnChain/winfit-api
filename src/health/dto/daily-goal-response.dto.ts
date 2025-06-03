import { ApiProperty } from '@nestjs/swagger';

export class DailyGoalResponseDto {
  @ApiProperty({ description: 'Current steps taken today' })
  currentSteps: number;

  @ApiProperty({ description: 'Daily step goal' })
  dailyGoal: number;

  @ApiProperty({ description: 'Progress percentage towards daily goal' })
  progress: number;

  @ApiProperty({ description: 'Remaining steps to reach daily goal' })
  remainingSteps: number;

  @ApiProperty({ description: 'Whether daily goal has been achieved' })
  goalAchieved: boolean;

  @ApiProperty({ description: 'Current distance covered today in meters' })
  currentDistance: number;

  @ApiProperty({ description: 'Current calories burned today' })
  currentCalories: number;

  @ApiProperty({ description: 'Current active minutes today' })
  currentActiveMinutes: number;

  @ApiProperty({ description: 'Hours left in the day' })
  hoursRemaining: number;

  @ApiProperty({ description: 'Estimated steps per hour needed to reach goal' })
  stepsPerHourNeeded: number;

  @ApiProperty({ description: 'Whether user is on track to meet goal' })
  onTrack: boolean;

  @ApiProperty({
    description: 'Current streak of consecutive days meeting goal',
  })
  currentStreak: number;

  @ApiProperty({ description: 'Date of the goal tracking' })
  date: string;
}
