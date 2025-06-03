import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum FriendChallengeStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  COMPLETED = 'COMPLETED',
}

@Entity('friend_challenges')
export class FriendChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'challenger_id' })
  challengerId: string;

  @Column({ name: 'challenged_id' })
  challengedId: string;

  @Column({ type: 'bigint' })
  goal: number;

  @Column({ type: 'int' }) // in days
  duration: number;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: FriendChallengeStatus,
    default: FriendChallengeStatus.PENDING,
  })
  status: FriendChallengeStatus;

  @Column({ name: 'winner_id', nullable: true })
  winnerId?: string;

  @Column({ name: 'challenger_progress', type: 'bigint', default: 0 })
  challengerProgress: number;

  @Column({ name: 'challenged_progress', type: 'bigint', default: 0 })
  challengedProgress: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenger_id' })
  challenger: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'challenged_id' })
  challenged: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'winner_id' })
  winner?: User;
}
