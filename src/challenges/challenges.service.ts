import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between } from 'typeorm';
import { Challenge } from './entities/challenge.entity';
import { UserChallenge } from './entities/user-challenge.entity';
import { ChallengeProgress } from './entities/challenge-progress.entity';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { ChallengeQueryDto } from './dto/challenge-query.dto';
import { ChallengeBaselineService } from './challenge-baseline.service';
import { NotificationsService } from '../notifications/notifications.service';

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
    private readonly challengeBaselineService: ChallengeBaselineService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createChallenge(
    createChallengeDto: CreateChallengeDto,
    createdBy: string,
  ): Promise<Challenge> {
    const startDate = new Date(createChallengeDto.startDate);
    const endDate = new Date(createChallengeDto.endDate);

    // Validate dates
    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    if (startDate < new Date()) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    // Calculate duration if not provided correctly
    const calculatedDuration = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (Math.abs(calculatedDuration - createChallengeDto.duration) > 1) {
      throw new BadRequestException(
        'Duration does not match the difference between start and end dates',
      );
    }

    const challenge = this.challengeRepository.create({
      ...createChallengeDto,
      startDate,
      endDate,
      createdBy,
      isActive: true,
      isFeatured: createChallengeDto.isFeatured || false,
    });

    return this.challengeRepository.save(challenge);
  }

  async getChallenges(
    filters: ChallengeFilters,
  ): Promise<{ challenges: Challenge[]; total: number }> {
    const queryBuilder =
      this.challengeRepository.createQueryBuilder('challenge');

    // Apply filters
    if (filters.type) {
      queryBuilder.andWhere('challenge.type = :type', { type: filters.type });
    }

    if (filters.category) {
      queryBuilder.andWhere('challenge.category = :category', {
        category: filters.category,
      });
    }

    if (filters.difficulty) {
      queryBuilder.andWhere('challenge.difficulty = :difficulty', {
        difficulty: filters.difficulty,
      });
    }

    if (filters.featured !== undefined) {
      queryBuilder.andWhere('challenge.isFeatured = :featured', {
        featured: filters.featured,
      });
    }

    // Status filter
    const now = new Date();
    if (filters.status === 'upcoming') {
      queryBuilder.andWhere('challenge.startDate > :now', { now });
    } else if (filters.status === 'active') {
      queryBuilder.andWhere(
        'challenge.startDate <= :now AND challenge.endDate >= :now',
        { now },
      );
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

  async getUserChallenges(
    userId: string,
    status?: string,
  ): Promise<UserChallenge[]> {
    const queryBuilder = this.userChallengeRepository
      .createQueryBuilder('userChallenge')
      .leftJoinAndSelect('userChallenge.challenge', 'challenge')
      .where('userChallenge.user.id = :userId', { userId });

    if (status === 'active') {
      const now = new Date();
      queryBuilder.andWhere(
        'challenge.startDate <= :now AND challenge.endDate >= :now AND userChallenge.isCompleted = false',
        { now },
      );
    } else if (status === 'completed') {
      queryBuilder.andWhere('userChallenge.isCompleted = true');
    } else if (status === 'upcoming') {
      const now = new Date();
      queryBuilder.andWhere('challenge.startDate > :now', { now });
    }

    return queryBuilder.orderBy('challenge.startDate', 'DESC').getMany();
  }

  async joinChallenge(
    challengeId: string,
    userId: string,
  ): Promise<UserChallenge> {
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
      throw new ConflictException(
        'User is already participating in this challenge',
      );
    }

    // Check max participants limit
    if (challenge.maxParticipants) {
      const currentParticipants = await this.userChallengeRepository.count({
        where: { challenge: { id: challengeId } },
      });

      if (currentParticipants >= challenge.maxParticipants) {
        throw new ConflictException(
          'Challenge has reached maximum participants',
        );
      }
    }

    const userChallenge = this.userChallengeRepository.create({
      user: { id: userId },
      challenge,
      joinedAt: new Date(),
      currentProgress: 0,
      completionPercentage: 0,
    });

    const savedUserChallenge =
      await this.userChallengeRepository.save(userChallenge);

    // Set baseline data for progress tracking
    try {
      await this.challengeBaselineService.setUserChallengeBaseline(
        userId,
        challengeId,
      );
    } catch (error) {
      // Log error but don't fail the join operation
      console.error('Error setting challenge baseline:', error);
    }

    // Send challenge joined notification
    try {
      await this.notificationsService.createChallengeNotification(
        userId,
        challenge.title,
        `You've successfully joined the challenge! Start tracking your progress.`,
        challenge.id,
      );
    } catch (error) {
      console.error('Error sending challenge notification:', error);
    }

    return savedUserChallenge;
  }

  async leaveChallenge(challengeId: string, userId: string): Promise<void> {
    const userChallenge = await this.userChallengeRepository.findOne({
      where: { challenge: { id: challengeId }, user: { id: userId } },
    });

    if (!userChallenge) {
      throw new NotFoundException(
        'User is not participating in this challenge',
      );
    }

    if (userChallenge.isCompleted) {
      throw new ConflictException('Cannot leave a completed challenge');
    }

    await this.userChallengeRepository.remove(userChallenge);
  }

  async getActiveChallenges(): Promise<Challenge[]> {
    const now = new Date();
    return this.challengeRepository.find({
      where: {
        isActive: true,
        startDate: LessThan(now),
        endDate: MoreThan(now),
      },
      order: { startDate: 'ASC' },
    });
  }

  async getChallengeById(challengeId: string): Promise<Challenge> {
    const challenge = await this.challengeRepository.findOne({
      where: { id: challengeId },
      relations: ['creator'],
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    return challenge;
  }

  async updateChallenge(
    challengeId: string,
    updateData: Partial<Challenge>,
  ): Promise<Challenge> {
    const challenge = await this.getChallengeById(challengeId);

    // Prevent updating certain fields if challenge has already started
    const now = new Date();
    if (challenge.startDate <= now) {
      const restrictedFields = [
        'goal',
        'duration',
        'startDate',
        'type',
        'category',
      ];
      const hasRestrictedUpdate = restrictedFields.some(
        (field) => field in updateData,
      );

      if (hasRestrictedUpdate) {
        throw new BadRequestException(
          'Cannot update goal, duration, dates, type, or category after challenge has started',
        );
      }
    }

    await this.challengeRepository.update(challengeId, updateData);
    return this.getChallengeById(challengeId);
  }

  async deleteChallenge(challengeId: string): Promise<void> {
    const challenge = await this.getChallengeById(challengeId);

    // Check if challenge has participants
    const participantCount = await this.userChallengeRepository.count({
      where: { challenge: { id: challengeId } },
    });

    if (participantCount > 0) {
      throw new ConflictException(
        'Cannot delete challenge with existing participants. Deactivate it instead.',
      );
    }

    await this.challengeRepository.remove(challenge);
  }

  async deactivateChallenge(challengeId: string): Promise<Challenge> {
    await this.challengeRepository.update(challengeId, { isActive: false });
    return this.getChallengeById(challengeId);
  }
}
