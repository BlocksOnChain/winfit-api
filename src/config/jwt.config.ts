import { registerAs } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export default registerAs(
  'jwt',
  (): JwtModuleOptions => ({
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    signOptions: {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    },
  }),
);

export const jwtRefreshConfig = registerAs('jwtRefresh', () => ({
  secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production',
  expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
})); 