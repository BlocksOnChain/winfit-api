import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FriendChallengeQueryDto {
  @ApiProperty({
    description: 'Filter by challenge status',
    example: 'active',
    enum: ['pending', 'active', 'completed'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'active', 'completed'])
  status?: 'pending' | 'active' | 'completed';
}
