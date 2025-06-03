import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../entities/notification.entity';

export class NotificationResponseDto {
  @ApiProperty({ description: 'Notification ID' })
  id: string;

  @ApiProperty({ description: 'Notification title' })
  title: string;

  @ApiProperty({ description: 'Notification message' })
  message: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  type: NotificationType;

  @ApiPropertyOptional({ description: 'Additional notification data' })
  data?: Record<string, any>;

  @ApiProperty({ description: 'Whether notification is read' })
  isRead: boolean;

  @ApiProperty({ description: 'Whether notification was sent' })
  isSent: boolean;

  @ApiPropertyOptional({ description: 'When notification was scheduled' })
  scheduledAt?: Date;

  @ApiPropertyOptional({ description: 'When notification was sent' })
  sentAt?: Date;

  @ApiProperty({ description: 'When notification was created' })
  createdAt: Date;
}

export class NotificationsListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto], description: 'List of notifications' })
  notifications: NotificationResponseDto[];

  @ApiProperty({ description: 'Number of unread notifications' })
  unreadCount: number;

  @ApiProperty({ description: 'Total number of notifications' })
  total: number;
} 