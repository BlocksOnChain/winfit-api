import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isPremium', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  async getUsers(
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
    @Query('isPremium') isPremium?: boolean,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.adminService.getUsers({
      search,
      isActive,
      isPremium,
      limit: Number(limit),
      offset: Number(offset),
    });
    return {
      success: true,
      data: result,
      message: 'Users retrieved successfully',
    };
  }

  @Get('challenges')
  @ApiOperation({ summary: 'Get all challenges for management' })
  @ApiResponse({
    status: 200,
    description: 'Challenges retrieved successfully',
  })
  async getChallenges(): Promise<ApiResponseDto<any>> {
    const challenges = await this.adminService.getChallenges();
    return {
      success: true,
      data: challenges,
      message: 'Challenges retrieved successfully',
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get analytics data' })
  @ApiResponse({
    status: 200,
    description: 'Analytics data retrieved successfully',
  })
  async getAnalytics(): Promise<ApiResponseDto<any>> {
    const analytics = await this.adminService.getAnalytics();
    return {
      success: true,
      data: analytics,
      message: 'Analytics data retrieved successfully',
    };
  }
}
