import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { MoveStoryDto } from './dto/move-story.dto';
import { StoryResponseDto } from './dto/story-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '@supabase/supabase-js';

@ApiTags('stories')
@Controller('stories')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  /**
   * Get all stories (with optional filtering by step_id and/or release_id)
   */
  @Get()
  @ApiOperation({
    summary: 'Get all stories with optional filtering',
    description:
      'Returns all stories, optionally filtered by step_id and/or release_id query parameters',
  })
  @ApiResponse({
    status: 200,
    description: 'List of stories ordered by cell and sort order',
    type: [StoryResponseDto],
  })
  async findAll(
    @Query('step_id') stepId?: string,
    @Query('release_id') releaseId?: string,
  ): Promise<StoryResponseDto[]> {
    // If both filters provided, return stories in that specific cell
    if (stepId && releaseId) {
      return this.storiesService.findByCell(stepId, releaseId);
    }

    // If only step_id provided
    if (stepId) {
      return this.storiesService.findByStepId(stepId);
    }

    // If only release_id provided
    if (releaseId) {
      return this.storiesService.findByReleaseId(releaseId);
    }

    // No filters, return all stories
    return this.storiesService.findAll();
  }

  /**
   * Get a single story by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single story by ID' })
  @ApiParam({
    name: 'id',
    description: 'Story UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Story details',
    type: StoryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Story not found',
  })
  async findOne(@Param('id') id: string): Promise<StoryResponseDto> {
    return this.storiesService.findOne(id);
  }

  /**
   * Create a new story
   */
  @Post()
  @ApiOperation({ summary: 'Create a new story' })
  @ApiResponse({
    status: 201,
    description: 'Story created successfully',
    type: StoryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async create(
    @Body() createStoryDto: CreateStoryDto,
    @GetUser() user: User,
  ): Promise<StoryResponseDto> {
    return this.storiesService.create(createStoryDto, user.id);
  }

  /**
   * Update an existing story
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing story' })
  @ApiParam({
    name: 'id',
    description: 'Story UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Story updated successfully',
    type: StoryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Story not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateStoryDto: UpdateStoryDto,
    @GetUser() user: User,
  ): Promise<StoryResponseDto> {
    return this.storiesService.update(id, updateStoryDto, user.id);
  }

  /**
   * Delete a story
   * CRITICAL: Removes all dependencies (both directions)
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a story',
    description:
      'Deletes story and all related data (dependencies, tags, personas, comments, attachments)',
  })
  @ApiParam({
    name: 'id',
    description: 'Story UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Story deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        dependencies_removed: { type: 'number', example: 3 },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Story not found',
  })
  async remove(
    @Param('id') id: string,
  ): Promise<{ success: boolean; dependencies_removed: number }> {
    return this.storiesService.remove(id);
  }

  /**
   * Move a story to a different cell
   * POST /stories/:id/move
   *
   * Dedicated endpoint for moving stories with automatic sort_order calculation
   */
  @Post(':id/move')
  @ApiOperation({
    summary: 'Move a story to a different cell (step and/or release)',
    description:
      'Moves a story to a new cell with automatic sort_order calculation. Provide at least one of step_id or release_id.',
  })
  @ApiParam({
    name: 'id',
    description: 'Story UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Story moved successfully',
    type: StoryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input - must provide at least one of step_id or release_id',
  })
  @ApiResponse({
    status: 404,
    description: 'Story, step, or release not found',
  })
  async move(
    @Param('id') id: string,
    @Body() moveDto: MoveStoryDto,
    @GetUser() user: User,
  ): Promise<StoryResponseDto> {
    return this.storiesService.move(id, moveDto, user.id);
  }
}
