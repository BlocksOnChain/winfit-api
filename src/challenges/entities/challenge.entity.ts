import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserChallenge } from './user-challenge.entity';

export enum ChallengeType {
  INDIVIDUAL = 'Individual',
  GROUP = 'Group',
  FRIENDS = 'Friends',
}

export enum ChallengeCategory {
  STEPS = 'Steps',
  DISTANCE = 'Distance',
  TIME = 'Time',
}

export enum ChallengeDifficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard',
}

export enum RewardType {
  COUPON = 'Coupon',
  BADGE = 'Badge',
  POINTS = 'Points',
  EXPERIENCE = 'Experience',
}

@Entity('challenges')
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ChallengeType })
  type: ChallengeType;

  @Column({ type: 'enum', enum: ChallengeCategory })
  category: ChallengeCategory;

  @Column({ type: 'bigint' })
  goal: number;

  @Column({ type: 'int' })
  duration: number; // in days

  @Column({ type: 'enum', enum: ChallengeDifficulty })
  difficulty: ChallengeDifficulty;

  @Column({ name: 'max_participants', type: 'int', nullable: true })
  maxParticipants?: number;

  @Column({ name: 'reward_type', type: 'enum', enum: RewardType, nullable: true })
  rewardType?: RewardType;

  @Column({ name: 'reward_value', type: 'text', nullable: true })
  rewardValue?: string;

  @Column({ name: 'reward_description', type: 'text', nullable: true })
  rewardDescription?: string;

  @Column({ name: 'reward_image_url', type: 'text', nullable: true })
  rewardImageUrl?: string;

  @Column({ name: 'challenge_image_url', type: 'text', nullable: true })
  challengeImageUrl?: string;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @OneToMany(() => UserChallenge, (userChallenge) => userChallenge.challenge)
  userChallenges: UserChallenge[];
} 