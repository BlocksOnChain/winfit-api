import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserReward } from './user-reward.entity';

export enum RewardType {
  COUPON = 'Coupon',
  BADGE = 'Badge',
  POINTS = 'Points',
  EXPERIENCE = 'Experience',
}

export enum RewardStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

@Entity('rewards')
export class Reward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: RewardType })
  type: RewardType;

  @Column({ type: 'text' })
  value: string; // Points amount, coupon code, badge identifier, etc.

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ name: 'icon_url', nullable: true })
  iconUrl?: string;

  @Column({ type: 'enum', enum: RewardStatus, default: RewardStatus.ACTIVE })
  status: RewardStatus;

  @Column({ name: 'points_cost', type: 'int', default: 0 })
  pointsCost: number; // Cost in points to redeem this reward

  @Column({ name: 'is_purchasable', default: false })
  isPurchasable: boolean; // Can be purchased with points

  @Column({ name: 'is_earnable', default: true })
  isEarnable: boolean; // Can be earned through achievements/challenges

  @Column({ name: 'max_redemptions', type: 'int', nullable: true })
  maxRedemptions?: number; // Maximum number of times this can be redeemed

  @Column({ name: 'current_redemptions', type: 'int', default: 0 })
  currentRedemptions: number;

  @Column({ name: 'expiry_date', type: 'timestamp', nullable: true })
  expiryDate?: Date;

  @Column({ name: 'terms_conditions', type: 'text', nullable: true })
  termsConditions?: string;

  @Column({ name: 'redemption_instructions', type: 'text', nullable: true })
  redemptionInstructions?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => UserReward, (userReward) => userReward.reward)
  userRewards: UserReward[];
} 