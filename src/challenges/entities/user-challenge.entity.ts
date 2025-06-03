import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Challenge } from './challenge.entity';
import { ChallengeProgress } from './challenge-progress.entity';

@Entity('user_challenges')
@Unique(['userId', 'challengeId'])
export class UserChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'challenge_id' })
  challengeId: string;

  @Column({ name: 'current_progress', type: 'bigint', default: 0 })
  currentProgress: number;

  @Column({ name: 'is_completed', default: false })
  isCompleted: boolean;

  @Column({
    name: 'completion_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  completionPercentage: number;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'int', nullable: true })
  rank?: number;

  @Column({ name: 'points_earned', type: 'int', default: 0 })
  pointsEarned: number;

  // Baseline tracking fields
  @Column({ name: 'baseline_date', type: 'date', nullable: true })
  baselineDate?: Date;

  @Column({ name: 'baseline_steps', type: 'bigint', default: 0 })
  baselineSteps: number;

  @Column({ name: 'baseline_distance', type: 'bigint', default: 0 })
  baselineDistance: number;

  @Column({ name: 'baseline_active_minutes', type: 'int', default: 0 })
  baselineActiveMinutes: number;

  @Column({ name: 'baseline_total_steps', type: 'bigint', default: 0 })
  baselineTotalSteps: number;

  @Column({ name: 'baseline_total_distance', type: 'bigint', default: 0 })
  baselineTotalDistance: number;

  // Relations
  @ManyToOne(() => User, (user) => user.userChallenges, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Challenge, (challenge) => challenge.userChallenges, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'challenge_id' })
  challenge: Challenge;

  @OneToMany(() => ChallengeProgress, (progress) => progress.userChallenge)
  progress: ChallengeProgress[];
}
