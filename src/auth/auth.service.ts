import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { User } from '../users/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    try {
      const user = await this.usersService.create(registerDto);

      // Generate email verification token if email verification is enabled
      if (!user.emailVerified) {
        const verificationToken = this.generateSecureToken();
        await this.storeVerificationToken(user.email, verificationToken);

        // Send verification email (non-blocking)
        this.emailService
          .sendEmailVerification(user.email, verificationToken)
          .catch((error) =>
            console.error('Failed to send verification email:', error),
          );
      }

      const tokens = await this.generateTokens(user);
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      return {
        user: this.sanitizeUser(user),
        ...tokens,
        expiresIn: this.getTokenExpirationSeconds(),
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new ConflictException('Registration failed');
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    const tokens = await this.generateTokens(user);

    // Store refresh token in Redis
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
      expiresIn: this.getTokenExpirationSeconds(),
    };
  }

  async logout(accessToken: string, userId: string): Promise<void> {
    // Blacklist the access token
    await this.blacklistToken(accessToken);

    // Remove stored refresh token
    await this.removeRefreshToken(userId);
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      user,
      password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: 'user',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwtRefresh.secret'),
        expiresIn: this.configService.get('jwtRefresh.expiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('jwtRefresh.secret'),
      });

      // Check if refresh token exists in Redis
      const storedToken = await this.getStoredRefreshToken(payload.sub);
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.usersService.findById(payload.sub);
      const newTokens = await this.generateTokens(user);

      // Update stored refresh token
      await this.storeRefreshToken(user.id, newTokens.refreshToken);

      return newTokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;
    const user = await this.usersService.findByEmail(email);

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return;
    }

    // Generate reset token
    const resetToken = this.generateSecureToken();
    await this.storePasswordResetToken(email, resetToken);

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Don't throw error to prevent revealing email existence
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = resetPasswordDto;

    // Verify reset token
    const email = await this.getEmailFromResetToken(token);
    if (!email) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Update user password
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.usersService.updatePassword(user.id, newPassword);

    // Remove reset token
    await this.removePasswordResetToken(token);

    // Invalidate all existing tokens for this user
    await this.removeRefreshToken(user.id);

    // Send password change notification
    this.emailService
      .sendPasswordChangeNotification(email)
      .catch((error) =>
        console.error('Failed to send password change notification:', error),
      );
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<void> {
    const { token } = verifyEmailDto;

    // Verify email token
    const email = await this.getEmailFromVerificationToken(token);
    if (!email) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Update user email verification status
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.usersService.verifyEmail(user.id);

    // Remove verification token
    await this.removeVerificationToken(token);
  }

  async resendEmailVerification(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = this.generateSecureToken();
    await this.storeVerificationToken(email, verificationToken);

    // Send verification email
    await this.emailService.sendEmailVerification(email, verificationToken);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklisted = await this.cacheManager.get(`blacklist:${token}`);
    return !!blacklisted;
  }

  // Private helper methods
  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const expiresIn = this.getRefreshTokenExpirationSeconds();
    await this.cacheManager.set(
      `refresh_token:${userId}`,
      refreshToken,
      expiresIn * 1000,
    );
  }

  private async getStoredRefreshToken(userId: string): Promise<string | null> {
    return (await this.cacheManager.get(`refresh_token:${userId}`)) as string | null;
  }

  private async removeRefreshToken(userId: string): Promise<void> {
    await this.cacheManager.del(`refresh_token:${userId}`);
  }

  private async blacklistToken(token: string): Promise<void> {
    const expiresIn = this.getTokenExpirationSeconds();
    await this.cacheManager.set(`blacklist:${token}`, true, expiresIn * 1000);
  }

  private async storePasswordResetToken(
    email: string,
    token: string,
  ): Promise<void> {
    // Store for 1 hour
    await this.cacheManager.set(`reset_token:${token}`, email, 3600 * 1000);
  }

  private async getEmailFromResetToken(token: string): Promise<string | null> {
    return (await this.cacheManager.get(`reset_token:${token}`)) as string | null;
  }

  private async removePasswordResetToken(token: string): Promise<void> {
    await this.cacheManager.del(`reset_token:${token}`);
  }

  private async storeVerificationToken(
    email: string,
    token: string,
  ): Promise<void> {
    // Store for 24 hours
    await this.cacheManager.set(
      `verification_token:${token}`,
      email,
      24 * 3600 * 1000,
    );
  }

  private async getEmailFromVerificationToken(
    token: string,
  ): Promise<string | null> {
    return (await this.cacheManager.get(`verification_token:${token}`)) as string | null;
  }

  private async removeVerificationToken(token: string): Promise<void> {
    await this.cacheManager.del(`verification_token:${token}`);
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private getTokenExpirationSeconds(): number {
    const expiresIn =
      this.configService.get('jwt.signOptions.expiresIn') || '15m';
    return this.parseExpirationToSeconds(expiresIn);
  }

  private getRefreshTokenExpirationSeconds(): number {
    const expiresIn = this.configService.get('jwtRefresh.expiresIn') || '7d';
    return this.parseExpirationToSeconds(expiresIn);
  }

  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 's':
        return num;
      case 'm':
        return num * 60;
      case 'h':
        return num * 3600;
      case 'd':
        return num * 86400;
      default:
        return 900;
    }
  }

  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}
