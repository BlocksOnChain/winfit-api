import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum TransactionType {
  EARNED = 'earned',
  SPENT = 'spent',
  GRANTED = 'granted',
  REVOKED = 'revoked',
}

export enum TransactionSource {
  ACHIEVEMENT = 'achievement',
  CHALLENGE = 'challenge',
  REWARD_PURCHASE = 'reward_purchase',
  ADMIN_GRANT = 'admin_grant',
  DAILY_LOGIN = 'daily_login',
  REFERRAL = 'referral',
  LEVEL_UP = 'level_up',
}

@Entity('points_transactions')
export class PointsTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'enum', enum: TransactionSource })
  source: TransactionSource;

  @Column({ name: 'source_id', nullable: true })
  sourceId?: string; // Achievement ID, Challenge ID, Reward ID, etc.

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'balance_before', type: 'int' })
  balanceBefore: number;

  @Column({ name: 'balance_after', type: 'int' })
  balanceAfter: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any; // Additional transaction data

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
} 