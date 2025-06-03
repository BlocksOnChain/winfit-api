import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('health_data')
@Unique(['userId', 'date'])
export class HealthData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'int', default: 0 })
  steps: number;

  @Column({ type: 'bigint', default: 0 })
  distance: number; // in meters

  @Column({ name: 'calories_burned', type: 'int', default: 0 })
  caloriesBurned: number;

  @Column({ name: 'active_minutes', type: 'int', default: 0 })
  activeMinutes: number;

  @Column({ name: 'floors_climbed', type: 'int', default: 0 })
  floorsClimbed: number;

  @Column({ name: 'heart_rate_avg', type: 'int', nullable: true })
  heartRateAvg?: number;

  @Column({ name: 'sleep_hours', type: 'decimal', precision: 4, scale: 2, nullable: true })
  sleepHours?: number;

  @Column({ name: 'water_intake_ml', type: 'int', default: 0 })
  waterIntakeMl: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.healthData, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
} 