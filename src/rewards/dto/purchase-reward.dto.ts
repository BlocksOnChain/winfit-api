import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class PurchaseRewardDto {
  @ApiProperty({
    description: 'ID of the reward to purchase',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  rewardId: string;
} 