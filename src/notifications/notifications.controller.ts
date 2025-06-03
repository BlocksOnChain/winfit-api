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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'type', required: false, enum: ['CHALLENGE', 'ACHIEVEMENT', 'FRIEND', 'SYSTEM'] })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  async getNotifications(
    @Query('type') type?: string,
    @Query('isRead') isRead?: boolean,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const notifications = await this.notificationsService.getNotifications(req.user.id, {
      type,
      isRead,
      limit: Number(limit),
      offset: Number(offset),
    });

    return {
      success: true,
      data: notifications,
      message: 'Notifications retrieved successfully',
    };
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  async markAsRead(
    @Param('id') notificationId: string,
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
    @Body() body: { deviceToken: string; platform: 'ios' | 'android' },
    @Request() req: any,
  ): Promise<ApiResponseDto<void>> {
    await this.notificationsService.registerDeviceToken(
      req.user.id,
      body.deviceToken,
      body.platform,
    );
    return {
      success: true,
      message: 'Device token registered successfully',
    };
  }
} 