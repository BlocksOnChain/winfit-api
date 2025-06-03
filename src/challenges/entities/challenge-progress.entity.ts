import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { UserChallenge } from './user-challenge.entity';

@Entity('challenge_progress')
@Unique(['userChallengeId', 'date'])
export class ChallengeProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_challenge_id' })
  userChallengeId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'daily_steps', type: 'int', default: 0 })
  dailySteps: number;

  @Column({ name: 'daily_distance', type: 'bigint', default: 0 })
  dailyDistance: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  percentage: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => UserChallenge, (userChallenge) => userChallenge.progress, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_challenge_id' })
  userChallenge: UserChallenge;
}
