import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { HealthData } from '../../health/entities/health-data.entity';
import { UserChallenge } from '../../challenges/entities/user-challenge.entity';
import { UserAchievement } from '../../achievements/entities/user-achievement.entity';
import { Friendship } from '../../friends/entities/friendship.entity';
import { Notification } from '../../notifications/entities/notification.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ name: 'password_hash' })
  @Exclude()
  passwordHash: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: Date;

  @Column({ length: 20, nullable: true })
  gender?: string;

  @Column({ name: 'height_cm', type: 'int', nullable: true })
  heightCm?: number;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 5, scale: 2, nullable: true })
  weightKg?: number;

  @Column({ name: 'total_steps', type: 'bigint', default: 0 })
  totalSteps: number;

  @Column({ name: 'total_distance', type: 'bigint', default: 0 })
  totalDistance: number;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'int', default: 0 })
  experience: number;

  @Column({ name: 'daily_step_goal', type: 'int', default: 10000 })
  dailyStepGoal: number;

  @Column({ name: 'weekly_step_goal', type: 'int', default: 70000 })
  weeklyStepGoal: number;

  @Column({ default: 'UTC', length: 50 })
  timezone: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_premium', default: false })
  isPremium: boolean;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => HealthData, (healthData) => healthData.user)
  healthData: HealthData[];

  @OneToMany(() => UserChallenge, (userChallenge) => userChallenge.user)
  userChallenges: UserChallenge[];

  @OneToMany(() => UserAchievement, (userAchievement) => userAchievement.user)
  userAchievements: UserAchievement[];

  @OneToMany(() => Friendship, (friendship) => friendship.requester)
  sentFriendRequests: Friendship[];

  @OneToMany(() => Friendship, (friendship) => friendship.addressee)
  receivedFriendRequests: Friendship[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
} 