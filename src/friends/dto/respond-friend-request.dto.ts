import { IsNotEmpty, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondFriendRequestDto {
  @ApiProperty({
    description: 'The action to take on the friend request',
    example: 'accept',
    enum: ['accept', 'decline'],
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['accept', 'decline'])
  action: 'accept' | 'decline';
}
