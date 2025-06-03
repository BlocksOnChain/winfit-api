import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChallengesService } from './challenges.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { Challenge } from './entities/challenge.entity';
import { UserChallenge } from './entities/user-challenge.entity';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { ChallengeQueryDto } from './dto/challenge-query.dto';
import {
  ChallengeListResponseDto,
  ChallengeDetailDto,
  UserChallengeDto,
} from './dto/challenge-response.dto';

@ApiTags('challenges')
@ApiBearerAuth()
@Controller('challenges')
@UseGuards(JwtAuthGuard)
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  @ApiOperation({ summary: 'Get available challenges' })
  @ApiResponse({
    status: 200,
    description: 'Challenges retrieved successfully',
    type: ApiResponseDto<ChallengeListResponseDto>,
  })
  async getChallenges(
    @Query() queryDto: ChallengeQueryDto,
  ): Promise<ApiResponseDto<ChallengeListResponseDto>> {
    const result = await this.challengesService.getChallenges({
      type: queryDto.type,
      category: queryDto.category,
      difficulty: queryDto.difficulty,
      status: queryDto.status,
      featured: queryDto.featured,
      limit: queryDto.limit || 20,
      offset: queryDto.offset || 0,
    });

    return {
      success: true,
      data: result,
      message: 'Challenges retrieved successfully',
    };
  }

  @Post('create')
  @ApiOperation({ summary: 'Create a new challenge (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Challenge created successfully',
    type: ApiResponseDto<Challenge>,
  })
  async createChallenge(
    @Body() createChallengeDto: CreateChallengeDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<Challenge>> {
    // TODO: Add admin role guard
    const challenge = await this.challengesService.createChallenge(
      createChallengeDto,
      req.user.id,
    );

    return {
      success: true,
      data: challenge,
      message: 'Challenge created successfully',
    };
  }

  @Get('user')
  @ApiOperation({ summary: 'Get user challenges' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'completed', 'upcoming'],
  })
  @ApiResponse({
    status: 200,
    description: 'User challenges retrieved successfully',
    type: ApiResponseDto<UserChallengeDto[]>,
  })
  async getUserChallenges(
    @Request() req: any,
    @Query('status') status?: string,
  ): Promise<ApiResponseDto<UserChallenge[]>> {
    const challenges = await this.challengesService.getUserChallenges(
      req.user.id,
      status,
    );
    return {
      success: true,
      data: challenges,
      message: 'User challenges retrieved successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get challenge details' })
  @ApiResponse({
    status: 200,
    description: 'Challenge details retrieved successfully',
    type: ApiResponseDto<ChallengeDetailDto>,
  })
  async getChallengeDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const challenge = await this.challengesService.getChallengeDetails(
      id,
      req.user.id,
    );
    return {
      success: true,
      data: challenge,
      message: 'Challenge details retrieved successfully',
    };
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a challenge' })
  @ApiResponse({
    status: 201,
    description: 'Successfully joined challenge',
    type: ApiResponseDto<UserChallenge>,
  })
  async joinChallenge(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<UserChallenge>> {
    const userChallenge = await this.challengesService.joinChallenge(
      id,
      req.user.id,
    );
    return {
      success: true,
      data: userChallenge,
      message: 'Successfully joined challenge',
    };
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave a challenge' })
  @ApiResponse({
    status: 200,
    description: 'Successfully left challenge',
  })
  async leaveChallenge(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<void>> {
    await this.challengesService.leaveChallenge(id, req.user.id);
    return {
      success: true,
      message: 'Successfully left challenge',
    };
  }
}
