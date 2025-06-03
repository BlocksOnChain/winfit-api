import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FriendsService } from './friends.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';

@ApiTags('friends')
@ApiBearerAuth()
@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user friends list' })
  @ApiResponse({
    status: 200,
    description: 'Friends list retrieved successfully',
  })
  async getFriends(@Request() req: any): Promise<ApiResponseDto<any>> {
    const friends = await this.friendsService.getFriends(req.user.id);
    return {
      success: true,
      data: friends,
      message: 'Friends list retrieved successfully',
    };
  }

  @Post('request')
  @ApiOperation({ summary: 'Send friend request' })
  @ApiResponse({
    status: 201,
    description: 'Friend request sent successfully',
  })
  async sendFriendRequest(
    @Body() body: { userId: string },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.friendsService.sendFriendRequest(req.user.id, body.userId);
    return {
      success: true,
      data: result,
      message: 'Friend request sent successfully',
    };
  }

  @Put('request/:id/respond')
  @ApiOperation({ summary: 'Respond to friend request' })
  @ApiResponse({
    status: 200,
    description: 'Friend request response processed successfully',
  })
  async respondToFriendRequest(
    @Param('id') requestId: string,
    @Body() body: { action: 'accept' | 'decline' },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.friendsService.respondToFriendRequest(
      requestId,
      req.user.id,
      body.action,
    );
    return {
      success: true,
      data: result,
      message: 'Friend request response processed successfully',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove friend' })
  @ApiResponse({
    status: 200,
    description: 'Friend removed successfully',
  })
  async removeFriend(
    @Param('id') friendId: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<void>> {
    await this.friendsService.removeFriend(req.user.id, friendId);
    return {
      success: true,
      message: 'Friend removed successfully',
    };
  }
} 