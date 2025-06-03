import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between } from 'typeorm';
import { Challenge } from './entities/challenge.entity';
import { UserChallenge } from './entities/user-challenge.entity';
import { ChallengeProgress } from './entities/challenge-progress.entity';
import { UpdateProgressDto } from './dto/update-progress.dto';

interface ChallengeFilters {
  type?: string;
  category?: string;
  difficulty?: string;
  status?: string;
  featured?: boolean;
  limit: number;
  offset: number;
}

@Injectable()
export class ChallengesService {
  constructor(
    @InjectRepository(Challenge)
    private readonly challengeRepository: Repository<Challenge>,
    @InjectRepository(UserChallenge)
    private readonly userChallengeRepository: Repository<UserChallenge>,
    @InjectRepository(ChallengeProgress)
    private readonly challengeProgressRepository: Repository<ChallengeProgress>,
  ) {}

  async getChallenges(filters: ChallengeFilters): Promise<{ challenges: Challenge[]; total: number }> {
    const queryBuilder = this.challengeRepository.createQueryBuilder('challenge');
    
    // Apply filters
    if (filters.type) {
      queryBuilder.andWhere('challenge.type = :type', { type: filters.type });
    }
    
    if (filters.category) {
      queryBuilder.andWhere('challenge.category = :category', { category: filters.category });
    }
    
    if (filters.difficulty) {
      queryBuilder.andWhere('challenge.difficulty = :difficulty', { difficulty: filters.difficulty });
    }
    
    if (filters.featured !== undefined) {
      queryBuilder.andWhere('challenge.isFeatured = :featured', { featured: filters.featured });
    }

    // Status filter
    const now = new Date();
    if (filters.status === 'upcoming') {
      queryBuilder.andWhere('challenge.startDate > :now', { now });
    } else if (filters.status === 'active') {
      queryBuilder.andWhere('challenge.startDate <= :now AND challenge.endDate >= :now', { now });
    } else if (filters.status === 'completed') {
      queryBuilder.andWhere('challenge.endDate < :now', { now });
    }

    queryBuilder.andWhere('challenge.isActive = :isActive', { isActive: true });

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination and ordering
    const challenges = await queryBuilder
      .orderBy('challenge.isFeatured', 'DESC')
      .addOrderBy('challenge.startDate', 'ASC')
      .skip(filters.offset)
      .take(filters.limit)
      .getMany();

    return { challenges, total };
  }

  async getChallengeDetails(challengeId: string, userId: string): Promise<any> {
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    // Get user's participation status
    const userChallenge = await this.userChallengeRepository.findOne({
      where: { challenge: { id: challengeId }, user: { id: userId } },
    });

    // Get participant count
    const participants = await this.userChallengeRepository.count({
      where: { challenge: { id: challengeId } },
    });

    // Get leaderboard (top 10)
    const leaderboard = await this.userChallengeRepository.find({
      where: { challenge: { id: challengeId } },
      relations: ['user'],
      order: { currentProgress: 'DESC' },
      take: 10,
    });

    return {
      ...challenge,
      participants,
      userProgress: userChallenge,
      leaderboard: leaderboard.map((uc, index) => ({
        rank: index + 1,
        user: {
          id: uc.user.id,
          username: uc.user.username,
          firstName: uc.user.firstName,
          lastName: uc.user.lastName,
          avatarUrl: uc.user.avatarUrl,
        },
        progress: uc.currentProgress,
        percentage: uc.completionPercentage,
      })),
    };
  }

  async getUserChallenges(userId: string, status?: string): Promise<UserChallenge[]> {
    const queryBuilder = this.userChallengeRepository.createQueryBuilder('userChallenge')
      .leftJoinAndSelect('userChallenge.challenge', 'challenge')
      .where('userChallenge.user.id = :userId', { userId });

    if (status === 'active') {
      const now = new Date();
      queryBuilder.andWhere('challenge.startDate <= :now AND challenge.endDate >= :now AND userChallenge.isCompleted = false', { now });
    } else if (status === 'completed') {
      queryBuilder.andWhere('userChallenge.isCompleted = true');
    } else if (status === 'upcoming') {
      const now = new Date();
      queryBuilder.andWhere('challenge.startDate > :now', { now });
    }

    return queryBuilder
      .orderBy('challenge.startDate', 'DESC')
      .getMany();
  }

  async joinChallenge(challengeId: string, userId: string): Promise<UserChallenge> {
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    // Check if challenge is active and not ended
    const now = new Date();
    if (challenge.endDate < now) {
      throw new ConflictException('Challenge has already ended');
    }

    // Check if user is already participating
    const existingParticipation = await this.userChallengeRepository.findOne({
      where: { challenge: { id: challengeId }, user: { id: userId } },
    });

    if (existingParticipation) {
      throw new ConflictException('User is already participating in this challenge');
    }

    // Check max participants limit
    if (challenge.maxParticipants) {
      const currentParticipants = await this.userChallengeRepository.count({
        where: { challenge: { id: challengeId } },
      });

      if (currentParticipants >= challenge.maxParticipants) {
        throw new ConflictException('Challenge has reached maximum participants');
      }
    }

    const userChallenge = this.userChallengeRepository.create({
      user: { id: userId },
      challenge,
      joinedAt: new Date(),
      currentProgress: 0,
      completionPercentage: 0,
    });

    return this.userChallengeRepository.save(userChallenge);
  }

  async leaveChallenge(challengeId: string, userId: string): Promise<void> {
    const userChallenge = await this.userChallengeRepository.findOne({
      where: { challenge: { id: challengeId }, user: { id: userId } },
    });

    if (!userChallenge) {
      throw new NotFoundException('User is not participating in this challenge');
    }

    if (userChallenge.isCompleted) {
      throw new ConflictException('Cannot leave a completed challenge');
    }

    await this.userChallengeRepository.remove(userChallenge);
  }

  async updateProgress(
    challengeId: string,
    userId: string,
    updateProgressDto: UpdateProgressDto,
  ): Promise<UserChallenge> {
    const userChallenge = await this.userChallengeRepository.findOne({
      where: { challenge: { id: challengeId }, user: { id: userId } },
      relations: ['challenge'],
    });

    if (!userChallenge) {
      throw new NotFoundException('User is not participating in this challenge');
    }

    if (userChallenge.isCompleted) {
      throw new ConflictException('Challenge is already completed');
    }

    // Create or update daily progress
    let challengeProgress = await this.challengeProgressRepository.findOne({
      where: {
        userChallenge: { id: userChallenge.id },
        date: new Date(updateProgressDto.date),
      },
    });

    if (!challengeProgress) {
      challengeProgress = this.challengeProgressRepository.create({
        userChallenge,
        date: new Date(updateProgressDto.date),
        dailySteps: updateProgressDto.progress,
        dailyDistance: updateProgressDto.progress,
      });
    } else {
      challengeProgress.dailySteps = updateProgressDto.progress;
      challengeProgress.dailyDistance = updateProgressDto.progress;
    }

    await this.challengeProgressRepository.save(challengeProgress);

    // Recalculate total progress
    await this.recalculateUserChallengeProgress(userChallenge.id);

    const updatedUserChallenge = await this.userChallengeRepository.findOne({
      where: { id: userChallenge.id },
      relations: ['challenge'],
    });

    if (!updatedUserChallenge) {
      throw new NotFoundException('User challenge not found after update');
    }

    return updatedUserChallenge;
  }

  private async recalculateUserChallengeProgress(userChallengeId: string): Promise<void> {
    const userChallenge = await this.userChallengeRepository.findOne({
      where: { id: userChallengeId },
      relations: ['challenge'],
    });

    if (!userChallenge) return;

    // Sum up all progress
    const progressEntries = await this.challengeProgressRepository.find({
      where: { userChallenge: { id: userChallengeId } },
    });

    const totalProgress = progressEntries.reduce((sum, entry) => {
      return sum + (userChallenge.challenge.category === 'Steps' ? entry.dailySteps : entry.dailyDistance);
    }, 0);

    const completionPercentage = Math.min((totalProgress / userChallenge.challenge.goal) * 100, 100);
    const isCompleted = completionPercentage >= 100;

    userChallenge.currentProgress = totalProgress;
    userChallenge.completionPercentage = Number(completionPercentage.toFixed(2));
    userChallenge.isCompleted = isCompleted;

    if (isCompleted && !userChallenge.completedAt) {
      userChallenge.completedAt = new Date();
    }

    await this.userChallengeRepository.save(userChallenge);
  }
} 