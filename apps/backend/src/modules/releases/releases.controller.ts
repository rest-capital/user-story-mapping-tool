import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReleasesService } from './releases.service';
import { StoriesService } from '../stories/stories.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { ReorderReleaseDto } from './dto/reorder-release.dto';
import { ReleaseResponseDto } from './dto/release-response.dto';
import { StoryResponseDto } from '../stories/dto/story-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '@supabase/supabase-js';

@ApiTags('releases')
@Controller('releases')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class ReleasesController {
  constructor(
    private readonly releasesService: ReleasesService,
    private readonly storiesService: StoriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new release' })
  @ApiResponse({
    status: 201,
    description: 'Release created successfully',
    type: ReleaseResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  create(
    @Body() createReleaseDto: CreateReleaseDto,
    @GetUser() user: User,
  ): Promise<ReleaseResponseDto> {
    return this.releasesService.create(createReleaseDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all releases' })
  @ApiResponse({
    status: 200,
    description: 'List of all releases',
    type: [ReleaseResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  findAll(): Promise<ReleaseResponseDto[]> {
    return this.releasesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single release by ID' })
  @ApiResponse({
    status: 200,
    description: 'Release found',
    type: ReleaseResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Release not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  findOne(@Param('id') id: string): Promise<ReleaseResponseDto> {
    return this.releasesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a release' })
  @ApiResponse({
    status: 200,
    description: 'Release updated successfully',
    type: ReleaseResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Release not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  update(
    @Param('id') id: string,
    @Body() updateReleaseDto: UpdateReleaseDto,
    @GetUser() user: User,
  ): Promise<ReleaseResponseDto> {
    return this.releasesService.update(id, updateReleaseDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a release',
    description:
      'Deletes a release and moves all associated stories to the Unassigned release. Cannot delete the Unassigned release itself.',
  })
  @ApiResponse({
    status: 200,
    description: 'Release deleted successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        stories_moved: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Release not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete Unassigned release',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  remove(@Param('id') id: string): Promise<{ success: boolean; stories_moved: number }> {
    return this.releasesService.remove(id);
  }

  /**
   * Reorder a release
   * POST /releases/:id/reorder
   *
   * Updates the sort_order to change position in the list
   */
  @Post(':id/reorder')
  @ApiOperation({ summary: 'Reorder a release by updating its sort order' })
  @ApiResponse({
    status: 200,
    description: 'Release reordered successfully',
    type: ReleaseResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Release not found',
  })
  reorder(
    @Param('id') id: string,
    @Body() reorderDto: ReorderReleaseDto,
    @GetUser() user: User,
  ): Promise<ReleaseResponseDto> {
    return this.releasesService.reorder(id, reorderDto, user.id);
  }

  /**
   * Get all stories for a specific release
   * GET /releases/:id/stories
   *
   * Returns all stories in this release across all steps
   */
  @Get(':id/stories')
  @ApiOperation({
    summary: 'Get all stories for a specific release (across all steps)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of stories for the release',
    type: [StoryResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Release not found',
  })
  getStories(@Param('id') releaseId: string): Promise<StoryResponseDto[]> {
    return this.storiesService.findByReleaseId(releaseId);
  }
}
