import { ApiProperty } from '@nestjs/swagger';
import { HealthData } from '../entities/health-data.entity';

export class HealthDataResponseDto {
  @ApiProperty({ description: 'Unique identifier for the health data entry' })
  id: string;

  @ApiProperty({ description: 'Date of the health data entry' })
  date: string;

  @ApiProperty({ description: 'Number of steps taken' })
  steps: number;

  @ApiProperty({ description: 'Distance covered in meters' })
  distance: number;

  @ApiProperty({ description: 'Calories burned' })
  caloriesBurned: number;

  @ApiProperty({ description: 'Active minutes' })
  activeMinutes: number;

  @ApiProperty({ description: 'Floors climbed' })
  floorsClimbed: number;

  @ApiProperty({ description: 'Average heart rate', required: false })
  heartRateAvg?: number;

  @ApiProperty({ description: 'Hours of sleep', required: false })
  sleepHours?: number;

  @ApiProperty({ description: 'Water intake in milliliters' })
  waterIntakeMl: number;

  @ApiProperty({ description: 'Entry creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Entry last update timestamp' })
  updatedAt: string;

  static fromEntity(entity: HealthData): HealthDataResponseDto {
    return {
      id: entity.id,
      date: entity.date.toISOString().split('T')[0],
      steps: entity.steps,
      distance: entity.distance,
      caloriesBurned: entity.caloriesBurned,
      activeMinutes: entity.activeMinutes,
      floorsClimbed: entity.floorsClimbed,
      heartRateAvg: entity.heartRateAvg,
      sleepHours: entity.sleepHours ? Number(entity.sleepHours) : undefined,
      waterIntakeMl: entity.waterIntakeMl,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  static fromEntities(entities: HealthData[]): HealthDataResponseDto[] {
    return entities.map((entity) => this.fromEntity(entity));
  }
}
