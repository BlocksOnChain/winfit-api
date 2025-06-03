import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { RegisterDto } from '../auth/dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(registerDto: RegisterDto): Promise<User> {
    const { email, username, password, ...userData } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this email or username already exists',
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = this.userRepository.create({
      email,
      username,
      passwordHash,
      ...userData,
      dateOfBirth: userData.dateOfBirth
        ? new Date(userData.dateOfBirth)
        : undefined,
    });

    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    Object.assign(user, updateUserDto);

    if (updateUserDto.dateOfBirth) {
      user.dateOfBirth = new Date(updateUserDto.dateOfBirth);
    }

    return this.userRepository.save(user);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async search(
    query: string,
    limit = 20,
    offset = 0,
  ): Promise<{ users: User[]; total: number }> {
    const [users, total] = await this.userRepository.findAndCount({
      where: [{ username: query }, { firstName: query }, { lastName: query }],
      take: limit,
      skip: offset,
      select: ['id', 'username', 'firstName', 'lastName', 'avatarUrl', 'level'],
    });

    return { users, total };
  }

  async updateStats(
    userId: string,
    steps: number,
    distance: number,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      totalSteps: () => `total_steps + ${steps}`,
      totalDistance: () => `total_distance + ${distance}`,
    });
  }

  async updateUserTotals(
    userId: string,
    totals: { totalSteps: number; totalDistance: number },
  ): Promise<void> {
    await this.userRepository.update(userId, {
      totalSteps: totals.totalSteps,
      totalDistance: totals.totalDistance,
    });
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update the user's password
    await this.userRepository.update(userId, { passwordHash });
  }

  async verifyEmail(userId: string): Promise<void> {
    // Mark the user's email as verified
    await this.userRepository.update(userId, { emailVerified: true });
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    // Update the user's refresh token (for future use if needed)
    await this.userRepository.update(userId, {
      // Note: Add refreshToken field to User entity if storing in database
      updatedAt: new Date(),
    });
  }
}
