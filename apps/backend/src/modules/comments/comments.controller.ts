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
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '@supabase/supabase-js';

@ApiTags('comments')
@Controller()
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Get all comments for a story
   */
  @Get('stories/:storyId/comments')
  @ApiOperation({ summary: 'Get all comments for a story' })
  @ApiParam({ name: 'storyId', description: 'Story ID' })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
    type: [CommentResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Story not found' })
  async findByStory(
    @Param('storyId') storyId: string,
    @GetUser() user: User,
  ): Promise<CommentResponseDto[]> {
    return this.commentsService.findByStory(storyId, user.id);
  }

  /**
   * Create a new comment on a story
   * Frontend sends ONLY content - auth info extracted from JWT
   */
  @Post('stories/:storyId/comments')
  @ApiOperation({ summary: 'Add a comment to a story' })
  @ApiParam({ name: 'storyId', description: 'Story ID' })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    type: CommentResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Story not found' })
  async create(
    @Param('storyId') storyId: string,
    @Body() createCommentDto: CreateCommentDto,
    @GetUser() user: User,
  ): Promise<CommentResponseDto> {
    // Extract user info from JWT (Supabase User object)
    const userId = user.id;
    const userName =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email ||
      'Unknown User';
    const avatarUrl = user.user_metadata?.avatar_url || null;

    return this.commentsService.create(
      storyId,
      createCommentDto,
      userId,
      userName,
      avatarUrl,
    );
  }

  /**
   * Update a comment
   * CRITICAL: Only the comment author can update
   */
  @Patch('comments/:id')
  @ApiOperation({ summary: 'Update a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
    type: CommentResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the comment author' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @GetUser() user: User,
  ): Promise<CommentResponseDto> {
    return this.commentsService.update(id, updateCommentDto, user.id);
  }

  /**
   * Delete a comment
   * CRITICAL: Only the comment author can delete
   */
  @Delete('comments/:id')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully',
    schema: { type: 'object', properties: { success: { type: 'boolean' } } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the comment author' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async remove(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<{ success: boolean }> {
    return this.commentsService.remove(id, user.id);
  }
}
