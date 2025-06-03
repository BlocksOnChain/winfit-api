import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PlatformType } from '../entities/device-token.entity';

export class RegisterDeviceTokenDto {
  @ApiProperty({ description: 'Device token for push notifications' })
  @IsString()
  @IsNotEmpty()
  deviceToken: string;

  @ApiProperty({ 
    enum: PlatformType, 
    description: 'Mobile platform',
    example: PlatformType.IOS
  })
  @IsEnum(PlatformType)
  platform: PlatformType;
} 