import { IsNotEmpty, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondFriendChallengeDto {
  @ApiProperty({
    description: 'The action to take on the friend challenge',
    example: 'accept',
    enum: ['accept', 'decline'],
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['accept', 'decline'])
  action: 'accept' | 'decline';
}
