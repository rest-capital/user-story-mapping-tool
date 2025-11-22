import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagResponseDto } from './dto/tag-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '@supabase/supabase-js';

@ApiTags('tags')
@Controller('tags')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  /**
   * Get all tags for a story map
   */
  @Get()
  @ApiOperation({ summary: 'Get all tags for a story map (workspace-scoped)' })
  @ApiResponse({
    status: 200,
    description: 'List of all tags ordered by name',
    type: [TagResponseDto],
  })
  async findAll(@Query('story_map_id') storyMapId: string): Promise<TagResponseDto[]> {
    return this.tagsService.findAll(storyMapId);
  }

  /**
   * Get a single tag by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single tag by ID' })
  @ApiParam({
    name: 'id',
    description: 'Tag UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Tag details',
    type: TagResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tag not found',
  })
  async findOne(@Param('id') id: string): Promise<TagResponseDto> {
    return this.tagsService.findOne(id);
  }

  /**
   * Create a new tag
   */
  @Post()
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({
    status: 201,
    description: 'Tag created successfully',
    type: TagResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Tag with this name already exists',
  })
  async create(
    @Body() createTagDto: CreateTagDto,
    @GetUser() user: User,
  ): Promise<TagResponseDto> {
    return this.tagsService.create(createTagDto, user.id);
  }

  /**
   * Delete a tag
   * Removes tag from all stories automatically
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a tag',
    description: 'Removes tag from all stories (cascade delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'Tag UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'story_map_id',
    description: 'Story Map ID (workspace context)',
    type: 'string',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Tag deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Tag not found or not in specified workspace',
  })
  async remove(
    @Param('id') id: string,
    @Query('story_map_id') storyMapId: string,
  ): Promise<{ success: boolean }> {
    return this.tagsService.remove(id, storyMapId);
  }
}
