import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { DeviceToken, PlatformType } from './entities/device-token.entity';
import { PushNotificationService, PushNotificationData } from './services/push-notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationsListResponseDto, NotificationResponseDto } from './dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>,
    private pushNotificationService: PushNotificationService,
  ) {}

  async getNotifications(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<NotificationsListResponseDto> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    // Apply filters
    if (query.type) {
      queryBuilder.andWhere('notification.type = :type', { type: query.type });
    }

    if (query.isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead: query.isRead });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get unread count
    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    // Apply pagination
    const notifications = await queryBuilder
      .skip(query.offset)
      .take(query.limit)
      .getMany();

    return {
      notifications: notifications.map(this.mapToResponseDto),
      unreadCount,
      total,
    };
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.isRead) {
      await this.notificationRepository.update(notificationId, { isRead: true });
      this.logger.log(`Notification ${notificationId} marked as read for user ${userId}`);
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    this.logger.log(`All notifications marked as read for user ${userId}`);
  }

  async registerDeviceToken(
    userId: string,
    deviceToken: string,
    platform: PlatformType,
  ): Promise<void> {
    try {
      // Validate token with push service
      const isValidToken = await this.pushNotificationService.validateDeviceToken(
        deviceToken,
        platform,
      );

      if (!isValidToken) {
        this.logger.warn(`Invalid device token provided: ${deviceToken}`);
        return;
      }

      // Check if token already exists
      const existingToken = await this.deviceTokenRepository.findOne({
        where: { deviceToken },
      });

      if (existingToken) {
        if (existingToken.userId !== userId) {
          // Token moved to different user, update it
          await this.deviceTokenRepository.update(existingToken.id, {
            userId,
            lastUsedAt: new Date(),
            isActive: true,
          });
        } else {
          // Update last used time
          await this.deviceTokenRepository.update(existingToken.id, {
            lastUsedAt: new Date(),
            isActive: true,
          });
        }
      } else {
        // Create new token
        const newToken = this.deviceTokenRepository.create({
          userId,
          deviceToken,
          platform,
          isActive: true,
          lastUsedAt: new Date(),
        });

        await this.deviceTokenRepository.save(newToken);
      }

      this.logger.log(`Device token registered for user ${userId} on ${platform}`);
    } catch (error) {
      this.logger.error(`Failed to register device token: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createNotification(createDto: CreateNotificationDto): Promise<NotificationResponseDto> {
    try {
      const notification = this.notificationRepository.create({
        userId: createDto.userId,
        title: createDto.title,
        message: createDto.message,
        type: createDto.type,
        data: createDto.data,
        scheduledAt: createDto.scheduledAt,
        isRead: false,
        isSent: false,
      });

      const savedNotification = await this.notificationRepository.save(notification);

      // Send push notification if requested and not scheduled
      if (createDto.sendPush !== false && !createDto.scheduledAt) {
        await this.sendPushNotificationToUser(
          createDto.userId,
          {
            title: createDto.title,
            body: createDto.message,
            data: createDto.data,
          },
        );

        // Mark as sent
        await this.notificationRepository.update(savedNotification.id, {
          isSent: true,
          sentAt: new Date(),
        });
      }

      this.logger.log(`Notification created for user ${createDto.userId}: ${createDto.title}`);
      return this.mapToResponseDto(savedNotification);
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendPushNotificationToUser(
    userId: string,
    notification: PushNotificationData,
  ): Promise<void> {
    const deviceTokens = await this.deviceTokenRepository.find({
      where: { userId, isActive: true },
    });

    if (deviceTokens.length === 0) {
      this.logger.warn(`No active device tokens found for user ${userId}`);
      return;
    }

    // Send to all user's devices
    const result = await this.pushNotificationService.sendBulkPushNotifications(
      deviceTokens,
      notification,
    );

    this.logger.log(
      `Push notifications sent to user ${userId} - Success: ${result.success}, Failed: ${result.failure}`,
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  async createChallengeNotification(
    userId: string,
    challengeTitle: string,
    message: string,
    challengeId?: string,
  ): Promise<void> {
    await this.createNotification({
      userId,
      title: `Challenge: ${challengeTitle}`,
      message,
      type: NotificationType.CHALLENGE,
      data: challengeId ? { challengeId } : undefined,
      sendPush: true,
    });
  }

  async createAchievementNotification(
    userId: string,
    achievementTitle: string,
    points?: number,
    achievementId?: string,
  ): Promise<void> {
    const message = points 
      ? `Congratulations! You earned ${points} points!`
      : 'Congratulations on your achievement!';

    await this.createNotification({
      userId,
      title: `Achievement Unlocked: ${achievementTitle}`,
      message,
      type: NotificationType.ACHIEVEMENT,
      data: { achievementId, points },
      sendPush: true,
    });
  }

  async createFriendNotification(
    userId: string,
    friendName: string,
    message: string,
    friendId?: string,
  ): Promise<void> {
    await this.createNotification({
      userId,
      title: `Friend Request`,
      message: `${friendName} ${message}`,
      type: NotificationType.FRIEND,
      data: friendId ? { friendId } : undefined,
      sendPush: true,
    });
  }

  async createSystemNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<void> {
    await this.createNotification({
      userId,
      title,
      message,
      type: NotificationType.SYSTEM,
      data,
      sendPush: true,
    });
  }

  private mapToResponseDto(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      data: notification.data,
      isRead: notification.isRead,
      isSent: notification.isSent,
      scheduledAt: notification.scheduledAt,
      sentAt: notification.sentAt,
      createdAt: notification.createdAt,
    };
  }
}
