import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserAchievement } from './user-achievement.entity';

export enum AchievementCategory {
  STEPS = 'Steps',
  DISTANCE = 'Distance',
  CHALLENGES = 'Challenges',
  SOCIAL = 'Social',
}

export enum RequirementType {
  TOTAL_STEPS = 'TOTAL_STEPS',
  TOTAL_DISTANCE = 'TOTAL_DISTANCE',
  DAILY_STEPS = 'DAILY_STEPS',
  USER_LEVEL = 'USER_LEVEL',
  CHALLENGES_COMPLETED = 'CHALLENGES_COMPLETED',
  FRIENDS_COUNT = 'FRIENDS_COUNT',
}

@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ type: 'enum', enum: AchievementCategory })
  category: AchievementCategory;

  @Column({
    name: 'requirement_type',
    type: 'enum',
    enum: RequirementType,
    nullable: true,
  })
  requirementType?: RequirementType;

  @Column({ name: 'requirement_value', type: 'bigint', nullable: true })
  requirementValue?: number;

  @Column({ name: 'points_reward', type: 'int', default: 0 })
  pointsReward: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @OneToMany(
    () => UserAchievement,
    (userAchievement) => userAchievement.achievement,
  )
  userAchievements: UserAchievement[];
}
