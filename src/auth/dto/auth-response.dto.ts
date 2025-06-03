import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

export class AuthResponseDto {
  @ApiProperty({ description: 'User information', type: User })
  user: Partial<User>;

  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    required: false,
  })
  expiresIn?: number;
}
