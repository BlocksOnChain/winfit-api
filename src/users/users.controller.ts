import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { User } from './entities/user.entity';

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    username: string;
  };
}

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  async getProfile(@Request() req: AuthRequest): Promise<ApiResponseDto<User>> {
    const user = await this.usersService.findById(req.user.id);
    return {
      success: true,
      data: user,
      message: 'User profile retrieved successfully',
    };
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @Request() req: AuthRequest,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ApiResponseDto<User>> {
    const user = await this.usersService.update(req.user.id, updateUserDto);
    return {
      success: true,
      data: user,
      message: 'Profile updated successfully',
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
  })
  async getStats(
    @Request() req: AuthRequest,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ApiResponseDto<any>> {
    // This would be implemented with actual statistics calculation
    const stats = {
      dailySteps: 8500,
      weeklySteps: 59500,
      monthlySteps: 255000,
      dailyDistance: 6800,
      weeklyDistance: 47600,
      monthlyDistance: 204000,
      activeDays: 25,
      averageStepsPerDay: 8500,
      totalChallengesCompleted: 12,
      currentStreak: 7,
      longestStreak: 21,
    };

    return {
      success: true,
      data: stats,
      message: 'User statistics retrieved successfully',
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search for users by username or name' })
  @ApiResponse({ status: 200, description: 'Users found successfully' })
  async searchUsers(
    @Query('q') query: string,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ): Promise<ApiResponseDto<{ users: User[]; total: number }>> {
    const result = await this.usersService.search(query, limit, offset);
    return {
      success: true,
      data: result,
      message: 'Users found successfully',
    };
  }
}
