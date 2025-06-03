import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Friendship, FriendshipStatus } from './entities/friendship.entity';
import {
  FriendChallenge,
  FriendChallengeStatus,
} from './entities/friend-challenge.entity';
import { UsersService } from '../users/users.service';
import {
  FriendsListResponseDto,
  FriendUserDto,
  FriendRequestDto,
} from './dto/friendship-response.dto';
import { FriendChallengeResponseDto } from './dto/friend-challenge-response.dto';
import { CreateFriendChallengeDto } from './dto/create-friend-challenge.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    @InjectRepository(FriendChallenge)
    private friendChallengeRepository: Repository<FriendChallenge>,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
  ) {}

  async getFriends(userId: string): Promise<FriendsListResponseDto> {
    // Get accepted friendships
    const acceptedFriendships = await this.friendshipRepository.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
      relations: ['requester', 'addressee'],
    });

    // Get pending incoming requests
    const pendingRequests = await this.friendshipRepository.find({
      where: {
        addresseeId: userId,
        status: FriendshipStatus.PENDING,
      },
      relations: ['requester', 'addressee'],
    });

    // Get sent outgoing requests
    const sentRequests = await this.friendshipRepository.find({
      where: {
        requesterId: userId,
        status: FriendshipStatus.PENDING,
      },
      relations: ['requester', 'addressee'],
    });

    // Map to response DTOs
    const friends: FriendUserDto[] = acceptedFriendships.map((friendship) => {
      const friend =
        friendship.requesterId === userId
          ? friendship.addressee
          : friendship.requester;
      return this.mapUserToFriendDto(friend);
    });

    const pendingRequestsDto: FriendRequestDto[] = pendingRequests.map(
      (request) => ({
        id: request.id,
        status: request.status,
        requester: this.mapUserToFriendDto(request.requester),
        addressee: this.mapUserToFriendDto(request.addressee),
        createdAt: request.createdAt,
      }),
    );

    const sentRequestsDto: FriendRequestDto[] = sentRequests.map((request) => ({
      id: request.id,
      status: request.status,
      requester: this.mapUserToFriendDto(request.requester),
      addressee: this.mapUserToFriendDto(request.addressee),
      createdAt: request.createdAt,
    }));

    return {
      friends,
      pendingRequests: pendingRequestsDto,
      sentRequests: sentRequestsDto,
    };
  }

  async sendFriendRequest(fromUserId: string, toUserId: string): Promise<any> {
    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if target user exists
    const targetUser = await this.usersService.findById(toUserId);
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Get sender user info for notification
    const senderUser = await this.usersService.findById(fromUserId);

    // Check if friendship already exists
    const existingFriendship = await this.friendshipRepository.findOne({
      where: [
        { requesterId: fromUserId, addresseeId: toUserId },
        { requesterId: toUserId, addresseeId: fromUserId },
      ],
    });

    if (existingFriendship) {
      if (existingFriendship.status === FriendshipStatus.ACCEPTED) {
        throw new BadRequestException('You are already friends with this user');
      } else if (existingFriendship.status === FriendshipStatus.PENDING) {
        throw new BadRequestException('Friend request already sent');
      } else if (existingFriendship.status === FriendshipStatus.BLOCKED) {
        throw new BadRequestException(
          'Cannot send friend request to this user',
        );
      }
    }

    // Create new friendship request
    const friendship = this.friendshipRepository.create({
      requesterId: fromUserId,
      addresseeId: toUserId,
      status: FriendshipStatus.PENDING,
    });

    const savedFriendship = await this.friendshipRepository.save(friendship);

    // Send friend request notification
    try {
      await this.notificationsService.createFriendNotification(
        toUserId,
        `${senderUser.firstName} ${senderUser.lastName}`,
        'sent you a friend request',
        fromUserId,
      );
    } catch (error) {
      console.error('Error sending friend request notification:', error);
    }

    return {
      id: savedFriendship.id,
      status: savedFriendship.status,
      createdAt: savedFriendship.createdAt,
    };
  }

  async respondToFriendRequest(
    requestId: string,
    userId: string,
    action: 'accept' | 'decline',
  ): Promise<any> {
    const friendship = await this.friendshipRepository.findOne({
      where: { id: requestId, addresseeId: userId },
      relations: ['requester', 'addressee'],
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('Friend request is no longer pending');
    }

    friendship.status =
      action === 'accept'
        ? FriendshipStatus.ACCEPTED
        : FriendshipStatus.DECLINED;

    const updatedFriendship = await this.friendshipRepository.save(friendship);

    // Send notification to the requester
    try {
      const message = action === 'accept' 
        ? 'accepted your friend request' 
        : 'declined your friend request';
      
      await this.notificationsService.createFriendNotification(
        friendship.requesterId,
        `${friendship.addressee.firstName} ${friendship.addressee.lastName}`,
        message,
        userId,
      );
    } catch (error) {
      console.error('Error sending friend response notification:', error);
    }

    return {
      id: updatedFriendship.id,
      status: updatedFriendship.status,
      updatedAt: updatedFriendship.updatedAt,
    };
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    const friendship = await this.friendshipRepository.findOne({
      where: [
        {
          requesterId: userId,
          addresseeId: friendId,
          status: FriendshipStatus.ACCEPTED,
        },
        {
          requesterId: friendId,
          addresseeId: userId,
          status: FriendshipStatus.ACCEPTED,
        },
      ],
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.friendshipRepository.remove(friendship);
  }

  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await this.friendshipRepository.findOne({
      where: [
        {
          requesterId: userId1,
          addresseeId: userId2,
          status: FriendshipStatus.ACCEPTED,
        },
        {
          requesterId: userId2,
          addresseeId: userId1,
          status: FriendshipStatus.ACCEPTED,
        },
      ],
    });

    return !!friendship;
  }

  async createFriendChallenge(
    challengerId: string,
    dto: CreateFriendChallengeDto,
  ): Promise<FriendChallengeResponseDto> {
    // Check if users are friends
    const areFriends = await this.areFriends(challengerId, dto.friendId);
    if (!areFriends) {
      throw new ForbiddenException('You can only challenge friends');
    }

    // Calculate end date
    const startDate = new Date(dto.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + dto.duration);

    // Check if challenge already exists between these users in the same period
    const existingChallenge = await this.friendChallengeRepository.findOne({
      where: [
        {
          challengerId,
          challengedId: dto.friendId,
          status: Not(FriendChallengeStatus.COMPLETED),
        },
        {
          challengerId: dto.friendId,
          challengedId: challengerId,
          status: Not(FriendChallengeStatus.COMPLETED),
        },
      ],
    });

    if (existingChallenge) {
      throw new BadRequestException(
        'An active challenge already exists between you and this friend',
      );
    }

    // Create challenge
    const challenge = this.friendChallengeRepository.create({
      challengerId,
      challengedId: dto.friendId,
      goal: dto.goal,
      duration: dto.duration,
      startDate,
      endDate,
    });

    const savedChallenge = await this.friendChallengeRepository.save(challenge);

    // Load with relations
    const challengeWithRelations = await this.friendChallengeRepository.findOne(
      {
        where: { id: savedChallenge.id },
        relations: ['challenger', 'challenged', 'winner'],
      },
    );

    if (!challengeWithRelations) {
      throw new NotFoundException('Challenge not found after creation');
    }

    return this.mapFriendChallengeToDto(challengeWithRelations);
  }

  async getFriendChallenges(
    userId: string,
    status?: 'pending' | 'active' | 'completed',
  ): Promise<FriendChallengeResponseDto[]> {
    let queryBuilder = this.friendChallengeRepository
      .createQueryBuilder('challenge')
      .leftJoinAndSelect('challenge.challenger', 'challenger')
      .leftJoinAndSelect('challenge.challenged', 'challenged')
      .leftJoinAndSelect('challenge.winner', 'winner')
      .where(
        '(challenge.challengerId = :userId OR challenge.challengedId = :userId)',
        { userId },
      );

    if (status) {
      switch (status) {
        case 'pending':
          queryBuilder = queryBuilder.andWhere('challenge.status = :status', {
            status: FriendChallengeStatus.PENDING,
          });
          break;
        case 'active':
          queryBuilder = queryBuilder.andWhere('challenge.status = :status', {
            status: FriendChallengeStatus.ACCEPTED,
          });
          break;
        case 'completed':
          queryBuilder = queryBuilder.andWhere('challenge.status = :status', {
            status: FriendChallengeStatus.COMPLETED,
          });
          break;
      }
    }

    const challenges = await queryBuilder
      .orderBy('challenge.createdAt', 'DESC')
      .getMany();

    return challenges.map((challenge) =>
      this.mapFriendChallengeToDto(challenge),
    );
  }

  async respondToFriendChallenge(
    challengeId: string,
    userId: string,
    action: 'accept' | 'decline',
  ): Promise<FriendChallengeResponseDto> {
    const challenge = await this.friendChallengeRepository.findOne({
      where: { id: challengeId, challengedId: userId },
      relations: ['challenger', 'challenged', 'winner'],
    });

    if (!challenge) {
      throw new NotFoundException('Friend challenge not found');
    }

    if (challenge.status !== FriendChallengeStatus.PENDING) {
      throw new BadRequestException('Challenge is no longer pending');
    }

    challenge.status =
      action === 'accept'
        ? FriendChallengeStatus.ACCEPTED
        : FriendChallengeStatus.DECLINED;

    const updatedChallenge =
      await this.friendChallengeRepository.save(challenge);

    return this.mapFriendChallengeToDto(updatedChallenge);
  }

  private mapUserToFriendDto(user: any): FriendUserDto {
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      level: user.level,
      totalSteps: user.totalSteps,
      totalDistance: user.totalDistance,
    };
  }

  private mapFriendChallengeToDto(
    challenge: FriendChallenge,
  ): FriendChallengeResponseDto {
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (challenge.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    return {
      id: challenge.id,
      goal: challenge.goal,
      duration: challenge.duration,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      status: challenge.status,
      challenger: this.mapUserToFriendDto(challenge.challenger),
      challenged: this.mapUserToFriendDto(challenge.challenged),
      winner: challenge.winner
        ? this.mapUserToFriendDto(challenge.winner)
        : undefined,
      challengerProgress: challenge.challengerProgress,
      challengedProgress: challenge.challengedProgress,
      challengerPercentage:
        (challenge.challengerProgress / challenge.goal) * 100,
      challengedPercentage:
        (challenge.challengedProgress / challenge.goal) * 100,
      daysRemaining,
      createdAt: challenge.createdAt,
      updatedAt: challenge.updatedAt,
    };
  }
}
