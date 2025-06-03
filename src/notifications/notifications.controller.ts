import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { RegisterDeviceTokenDto } from './dto/device-token.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsListResponseDto, NotificationResponseDto } from './dto/notification-response.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    type: NotificationsListResponseDto,
  })
  async getNotifications(
    @Query(ValidationPipe) query: NotificationQueryDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<NotificationsListResponseDto>> {
    const notifications = await this.notificationsService.getNotifications(
      req.user.id,
      query,
    );

    return {
      success: true,
      data: notifications,
      message: 'Notifications retrieved successfully',
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
  })
  async getUnreadCount(@Request() req: any): Promise<ApiResponseDto<{ count: number }>> {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return {
      success: true,
      data: { count },
      message: 'Unread count retrieved successfully',
    };
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  async markAsRead(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<void>> {
    await this.notificationsService.markAsRead(notificationId, req.user.id);
    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
  })
  async markAllAsRead(@Request() req: any): Promise<ApiResponseDto<void>> {
    await this.notificationsService.markAllAsRead(req.user.id);
    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  @Post('device-token')
  @ApiOperation({ summary: 'Register device token for push notifications' })
  @ApiResponse({
    status: 201,
    description: 'Device token registered successfully',
  })
  async registerDeviceToken(
    @Body(ValidationPipe) deviceTokenDto: RegisterDeviceTokenDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<void>> {
    await this.notificationsService.registerDeviceToken(
      req.user.id,
      deviceTokenDto.deviceToken,
      deviceTokenDto.platform,
    );
    return {
      success: true,
      message: 'Device token registered successfully',
    };
  }

  @Post('send-test')
  @ApiOperation({ 
    summary: 'Send test notification (for development)',
    description: 'Send a test push notification to verify setup'
  })
  @ApiResponse({
    status: 201,
    description: 'Test notification sent successfully',
  })
  async sendTestNotification(@Request() req: any): Promise<ApiResponseDto<void>> {
    await this.notificationsService.createSystemNotification(
      req.user.id,
      'Test Notification',
      'This is a test notification to verify your push notification setup!',
      { test: true },
    );
    
    return {
      success: true,
      message: 'Test notification sent successfully',
    };
  }

  // Admin endpoint for creating notifications (can be restricted to admin role later)
  @Post('admin/create')
  @ApiOperation({ 
    summary: 'Create notification (Admin)',
    description: 'Create a notification for any user (admin only)'
  })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
    type: NotificationResponseDto,
  })
  async createNotification(
    @Body(ValidationPipe) createDto: CreateNotificationDto,
  ): Promise<ApiResponseDto<NotificationResponseDto>> {
    const notification = await this.notificationsService.createNotification(createDto);
    
    return {
      success: true,
      data: notification,
      message: 'Notification created successfully',
    };
  }
}
