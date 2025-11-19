import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
   * Get all stories
   */
  @Get()
  @ApiOperation({ summary: 'Get all stories' })
  @ApiResponse({
    status: 200,
    description: 'List of all stories ordered by cell and sort order',
    type: [StoryResponseDto],
  })
  async findAll(): Promise<StoryResponseDto[]> {
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
}
