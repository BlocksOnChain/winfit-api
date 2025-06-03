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
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FriendsService } from './friends.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { RespondFriendRequestDto } from './dto/respond-friend-request.dto';
import { CreateFriendChallengeDto } from './dto/create-friend-challenge.dto';
import { RespondFriendChallengeDto } from './dto/respond-friend-challenge.dto';
import { FriendChallengeQueryDto } from './dto/friend-challenge-query.dto';
import {
  FriendsListResponseDto,
  FriendRequestDto,
} from './dto/friendship-response.dto';
import { FriendChallengeResponseDto } from './dto/friend-challenge-response.dto';

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
    type: FriendsListResponseDto,
  })
  async getFriends(
    @Request() req: any,
  ): Promise<ApiResponseDto<FriendsListResponseDto>> {
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
    @Body() sendFriendRequestDto: SendFriendRequestDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.friendsService.sendFriendRequest(
      req.user.id,
      sendFriendRequestDto.userId,
    );
    return {
      success: true,
      data: result,
      message: 'Friend request sent successfully',
    };
  }

  @Put('request/:id/respond')
  @ApiOperation({ summary: 'Respond to friend request' })
  @ApiParam({
    name: 'id',
    description: 'Friend request ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Friend request response processed successfully',
  })
  async respondToFriendRequest(
    @Param('id', ParseUUIDPipe) requestId: string,
    @Body() respondFriendRequestDto: RespondFriendRequestDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.friendsService.respondToFriendRequest(
      requestId,
      req.user.id,
      respondFriendRequestDto.action,
    );
    return {
      success: true,
      data: result,
      message: 'Friend request response processed successfully',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove friend' })
  @ApiParam({
    name: 'id',
    description: 'Friend user ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Friend removed successfully',
  })
  async removeFriend(
    @Param('id', ParseUUIDPipe) friendId: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<void>> {
    await this.friendsService.removeFriend(req.user.id, friendId);
    return {
      success: true,
      message: 'Friend removed successfully',
    };
  }

  @Post('challenge')
  @ApiOperation({ summary: 'Create friend challenge' })
  @ApiResponse({
    status: 201,
    description: 'Friend challenge created successfully',
    type: FriendChallengeResponseDto,
  })
  async createFriendChallenge(
    @Body() createFriendChallengeDto: CreateFriendChallengeDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<FriendChallengeResponseDto>> {
    const challenge = await this.friendsService.createFriendChallenge(
      req.user.id,
      createFriendChallengeDto,
    );
    return {
      success: true,
      data: challenge,
      message: 'Friend challenge created successfully',
    };
  }

  @Get('challenges')
  @ApiOperation({ summary: 'Get friend challenges' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'active', 'completed'],
    description: 'Filter by challenge status',
  })
  @ApiResponse({
    status: 200,
    description: 'Friend challenges retrieved successfully',
    type: [FriendChallengeResponseDto],
  })
  async getFriendChallenges(
    @Query() query: FriendChallengeQueryDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<FriendChallengeResponseDto[]>> {
    const challenges = await this.friendsService.getFriendChallenges(
      req.user.id,
      query.status,
    );
    return {
      success: true,
      data: challenges,
      message: 'Friend challenges retrieved successfully',
    };
  }

  @Put('challenges/:id/respond')
  @ApiOperation({ summary: 'Respond to friend challenge' })
  @ApiParam({
    name: 'id',
    description: 'Friend challenge ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Friend challenge response processed successfully',
    type: FriendChallengeResponseDto,
  })
  async respondToFriendChallenge(
    @Param('id', ParseUUIDPipe) challengeId: string,
    @Body() respondFriendChallengeDto: RespondFriendChallengeDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<FriendChallengeResponseDto>> {
    const challenge = await this.friendsService.respondToFriendChallenge(
      challengeId,
      req.user.id,
      respondFriendChallengeDto.action,
    );
    return {
      success: true,
      data: challenge,
      message: 'Friend challenge response processed successfully',
    };
  }
}
