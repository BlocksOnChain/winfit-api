import { ApiProperty } from '@nestjs/swagger';

export class BestDayDto {
  @ApiProperty({ description: 'Date of the best day (most steps)' })
  date: string;

  @ApiProperty({ description: 'Number of steps on the best day' })
  steps: number;
}

export class TrendsDto {
  @ApiProperty({
    description: 'Percentage change in steps compared to previous period',
  })
  stepsChange: number;

  @ApiProperty({
    description: 'Percentage change in distance compared to previous period',
  })
  distanceChange: number;

  @ApiProperty({
    description: 'Percentage change in calories compared to previous period',
  })
  caloriesChange: number;

  @ApiProperty({
    description:
      'Percentage change in active minutes compared to previous period',
  })
  activeMinutesChange: number;
}

export class StreakDto {
  @ApiProperty({ description: 'Current consecutive days meeting step goal' })
  current: number;

  @ApiProperty({
    description: 'Longest streak of consecutive days meeting step goal',
  })
  longest: number;

  @ApiProperty({ description: 'Days remaining to break longest streak' })
  daysToRecord?: number;
}

export class WeeklyGoalDto {
  @ApiProperty({ description: 'Current progress towards weekly step goal' })
  currentSteps: number;

  @ApiProperty({ description: 'Weekly step goal' })
  weeklyGoal: number;

  @ApiProperty({ description: 'Progress percentage towards weekly goal' })
  progress: number;

  @ApiProperty({ description: 'Remaining steps to reach weekly goal' })
  remainingSteps: number;

  @ApiProperty({ description: 'Whether weekly goal has been achieved' })
  goalAchieved: boolean;
}

export class HealthSummaryResponseDto {
  @ApiProperty({ description: 'Total steps in the period' })
  totalSteps: number;

  @ApiProperty({ description: 'Total distance in meters' })
  totalDistance: number;

  @ApiProperty({ description: 'Total calories burned' })
  totalCalories: number;

  @ApiProperty({ description: 'Total active minutes' })
  totalActiveMinutes: number;

  @ApiProperty({ description: 'Average daily steps' })
  averageDailySteps: number;

  @ApiProperty({ description: 'Average daily distance in meters' })
  averageDailyDistance: number;

  @ApiProperty({ description: 'Number of active days (days with steps > 0)' })
  activeDays: number;

  @ApiProperty({ description: 'Total number of days in the period' })
  totalDays: number;

  @ApiProperty({
    description: 'Activity percentage (active days / total days)',
  })
  activityPercentage: number;

  @ApiProperty({ description: 'Best day information', type: BestDayDto })
  bestDay: BestDayDto;

  @ApiProperty({
    description: 'Trend comparisons with previous period',
    type: TrendsDto,
  })
  trends: TrendsDto;

  @ApiProperty({ description: 'Step goal streak information', type: StreakDto })
  streak: StreakDto;

  @ApiProperty({ description: 'Weekly goal progress', type: WeeklyGoalDto })
  weeklyGoal: WeeklyGoalDto;

  @ApiProperty({ description: 'Number of days goal was achieved' })
  goalAchievedDays: number;

  @ApiProperty({ description: 'Goal achievement percentage' })
  goalAchievementRate: number;
}
