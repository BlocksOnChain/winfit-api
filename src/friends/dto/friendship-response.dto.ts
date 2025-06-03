import { ApiProperty } from '@nestjs/swagger';
import { FriendshipStatus } from '../entities/friendship.entity';

export class FriendUserDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Username',
    example: 'john_doe',
  })
  username: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  avatarUrl?: string;

  @ApiProperty({
    description: 'User level',
    example: 5,
  })
  level: number;

  @ApiProperty({
    description: 'Total steps',
    example: 150000,
  })
  totalSteps: number;

  @ApiProperty({
    description: 'Total distance in meters',
    example: 120000,
  })
  totalDistance: number;
}

export class FriendRequestDto {
  @ApiProperty({
    description: 'Friendship ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Friendship status',
    enum: FriendshipStatus,
    example: FriendshipStatus.PENDING,
  })
  status: FriendshipStatus;

  @ApiProperty({
    description: 'User who sent the request',
    type: FriendUserDto,
  })
  requester: FriendUserDto;

  @ApiProperty({
    description: 'User who received the request',
    type: FriendUserDto,
  })
  addressee: FriendUserDto;

  @ApiProperty({
    description: 'Request creation date',
    example: '2024-12-06T12:00:00.000Z',
  })
  createdAt: Date;
}

export class FriendsListResponseDto {
  @ApiProperty({
    description: 'List of accepted friends',
    type: [FriendUserDto],
  })
  friends: FriendUserDto[];

  @ApiProperty({
    description: 'List of pending incoming friend requests',
    type: [FriendRequestDto],
  })
  pendingRequests: FriendRequestDto[];

  @ApiProperty({
    description: 'List of sent outgoing friend requests',
    type: [FriendRequestDto],
  })
  sentRequests: FriendRequestDto[];
}
