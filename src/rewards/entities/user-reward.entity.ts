import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Reward } from './reward.entity';

export enum UserRewardStatus {
  AVAILABLE = 'available',
  REDEEMED = 'redeemed',
  EXPIRED = 'expired',
}

export enum AcquisitionType {
  EARNED = 'earned', // From achievements, challenges, etc.
  PURCHASED = 'purchased', // Bought with points
  GRANTED = 'granted', // Admin granted
}

@Entity('user_rewards')
@Unique(['userId', 'rewardId']) // Allow multiple of same reward type
export class UserReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'reward_id' })
  rewardId: string;

  @Column({ type: 'enum', enum: UserRewardStatus, default: UserRewardStatus.AVAILABLE })
  status: UserRewardStatus;

  @Column({ type: 'enum', enum: AcquisitionType })
  acquisitionType: AcquisitionType;

  @Column({ name: 'points_spent', type: 'int', default: 0 })
  pointsSpent: number; // Points spent to acquire this reward

  @Column({ name: 'earned_from', nullable: true })
  earnedFrom?: string; // Challenge ID, Achievement ID, etc.

  @Column({ name: 'earned_reason', type: 'text', nullable: true })
  earnedReason?: string; // Description of how it was earned

  @Column({ name: 'redeem_code', nullable: true })
  redeemCode?: string; // Generated code for coupons

  @Column({ name: 'redemption_data', type: 'jsonb', nullable: true })
  redemptionData?: any; // Additional redemption information

  @CreateDateColumn({ name: 'earned_at' })
  earnedAt: Date;

  @Column({ name: 'redeemed_at', type: 'timestamp', nullable: true })
  redeemedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.userRewards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Reward, (reward) => reward.userRewards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reward_id' })
  reward: Reward;
} 