import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChallengesService } from './challenges.service';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { Challenge } from './entities/challenge.entity';
import { UserChallenge } from './entities/user-challenge.entity';
import { UpdateProgressDto } from './dto/update-progress.dto';

@ApiTags('challenges')
@ApiBearerAuth()
@Controller('challenges')
@UseGuards(JwtAuthGuard)
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  @ApiOperation({ summary: 'Get available challenges' })
  @ApiQuery({ name: 'type', required: false, enum: ['Individual', 'Group', 'Friends'] })
  @ApiQuery({ name: 'category', required: false, enum: ['Steps', 'Distance', 'Time'] })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['Easy', 'Medium', 'Hard'] })
  @ApiQuery({ name: 'status', required: false, enum: ['upcoming', 'active', 'completed'] })
  @ApiQuery({ name: 'featured', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Challenges retrieved successfully',
  })
  async getChallenges(
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: string,
    @Query('status') status?: string,
    @Query('featured') featured?: boolean,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ): Promise<ApiResponseDto<{ challenges: Challenge[]; total: number }>> {
    const result = await this.challengesService.getChallenges({
      type,
      category,
      difficulty,
      status,
      featured,
      limit: Number(limit),
      offset: Number(offset),
    });

    return {
      success: true,
      data: result,
      message: 'Challenges retrieved successfully',
    };
  }

  @Get('user')
  @ApiOperation({ summary: 'Get user challenges' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'completed', 'upcoming'] })
  @ApiResponse({
    status: 200,
    description: 'User challenges retrieved successfully',
  })
  async getUserChallenges(
    @Request() req: any,
    @Query('status') status?: string,
  ): Promise<ApiResponseDto<UserChallenge[]>> {
    const challenges = await this.challengesService.getUserChallenges(req.user.id, status);
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
  })
  async getChallengeDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const challenge = await this.challengesService.getChallengeDetails(id, req.user.id);
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
  })
  async joinChallenge(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<UserChallenge>> {
    const userChallenge = await this.challengesService.joinChallenge(id, req.user.id);
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

  @Put(':id/progress')
  @ApiOperation({ summary: 'Update challenge progress' })
  @ApiResponse({
    status: 200,
    description: 'Challenge progress updated successfully',
  })
  async updateProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProgressDto: UpdateProgressDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<UserChallenge>> {
    const userChallenge = await this.challengesService.updateProgress(
      id,
      req.user.id,
      updateProgressDto,
    );
    return {
      success: true,
      data: userChallenge,
      message: 'Challenge progress updated successfully',
    };
  }
} 