import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { StoryLinksService } from './story-links.service';
import { CreateStoryLinkDto } from './dto/create-story-link.dto';
import { StoryLinkResponseDto } from './dto/story-link-response.dto';

@ApiTags('story-links')
@Controller()
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class StoryLinksController {
  constructor(private readonly storyLinksService: StoryLinksService) {}

  /**
   * Add a dependency to a story
   * POST /api/stories/:id/dependencies
   */
  @Post('stories/:id/dependencies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a dependency to a story' })
  @ApiParam({
    name: 'id',
    description: 'Source story ID',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Dependency created successfully',
    type: StoryLinkResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (duplicate link, self-link, or validation error)',
  })
  @ApiResponse({ status: 404, description: 'Story not found' })
  async createDependency(
    @Param('id') storyId: string,
    @Body() createDto: CreateStoryLinkDto,
  ): Promise<StoryLinkResponseDto> {
    return this.storyLinksService.createStoryLink(storyId, createDto);
  }

  /**
   * Remove a dependency between two stories
   * DELETE /api/stories/:sourceId/dependencies/:targetId
   */
  @Delete('stories/:sourceId/dependencies/:targetId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a dependency between two stories' })
  @ApiParam({
    name: 'sourceId',
    description: 'Source story ID',
    type: String,
  })
  @ApiParam({
    name: 'targetId',
    description: 'Target story ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Dependency removed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Story link not found' })
  async removeDependency(
    @Param('sourceId') sourceId: string,
    @Param('targetId') targetId: string,
  ): Promise<{ success: boolean }> {
    return this.storyLinksService.deleteStoryLink(sourceId, targetId);
  }

  /**
   * Get all dependencies for a story
   * GET /api/stories/:id/dependencies
   * Returns both outgoing (this story depends on) and incoming (other stories depend on this)
   */
  @Get('stories/:id/dependencies')
  @ApiOperation({ summary: 'Get all dependencies for a story' })
  @ApiParam({
    name: 'id',
    description: 'Story ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Dependencies retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        outgoing: {
          type: 'array',
          description: 'Dependencies this story has on other stories',
          items: { $ref: '#/components/schemas/StoryLinkResponseDto' },
        },
        incoming: {
          type: 'array',
          description: 'Dependencies other stories have on this story',
          items: { $ref: '#/components/schemas/StoryLinkResponseDto' },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Story not found' })
  async getStoryDependencies(
    @Param('id') storyId: string,
  ): Promise<{
    outgoing: StoryLinkResponseDto[];
    incoming: StoryLinkResponseDto[];
  }> {
    return this.storyLinksService.getStoryDependencies(storyId);
  }
}
