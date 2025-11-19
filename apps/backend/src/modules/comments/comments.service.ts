import { Injectable, ForbiddenException } from '@nestjs/common';
import { BaseService } from '../../common/base.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommentError } from './errors/comment.error';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';

@Injectable()
export class CommentsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Define how to create domain errors
   */
  protected createDomainError(
    message: string,
    cause?: Error,
    context?: any,
  ): Error {
    return new CommentError(message, cause, context);
  }

  /**
   * Get all comments for a story
   * Adds is_current_user flag to each comment
   */
  async findByStory(
    storyId: string,
    currentUserId: string,
  ): Promise<CommentResponseDto[]> {
    this.validateRequired(storyId, 'storyId');
    this.validateRequired(currentUserId, 'currentUserId');

    return this.executeOperation(
      async () => {
        // Verify story exists
        const story = await this.prisma.story.findUnique({
          where: { id: storyId },
        });

        if (!story) {
          throw new CommentError('Story not found');
        }

        const comments = await this.prisma.comment.findMany({
          where: { storyId },
          orderBy: { createdAt: 'desc' },
        });

        return comments.map((comment) =>
          this.toResponseDto(comment, currentUserId),
        );
      },
      'findCommentsByStory',
      { storyId },
    );
  }

  /**
   * Get a single comment by ID
   */
  async findOne(
    id: string,
    currentUserId: string,
  ): Promise<CommentResponseDto> {
    this.validateRequired(id, 'id');
    this.validateRequired(currentUserId, 'currentUserId');

    return this.executeOperation(
      async () => {
        const comment = await this.prisma.comment.findUnique({
          where: { id },
        });

        if (!comment) {
          throw new CommentError('Comment not found');
        }

        return this.toResponseDto(comment, currentUserId);
      },
      'findOneComment',
      { commentId: id },
    );
  }

  /**
   * Create a new comment
   * Auth info (authorId, author, avatarUrl) extracted from JWT by controller
   */
  async create(
    storyId: string,
    createDto: CreateCommentDto,
    userId: string,
    userName: string,
    avatarUrl: string | null,
  ): Promise<CommentResponseDto> {
    this.validateRequired(storyId, 'storyId');
    this.validateRequired(createDto.content, 'content');
    this.validateRequired(userId, 'userId');
    this.validateRequired(userName, 'userName');

    return this.executeOperation(
      async () => {
        // Verify story exists
        const story = await this.prisma.story.findUnique({
          where: { id: storyId },
        });

        if (!story) {
          throw new CommentError('Story not found');
        }

        const comment = await this.prisma.comment.create({
          data: {
            storyId,
            authorId: userId,
            author: userName,
            avatarUrl,
            content: createDto.content,
          },
        });

        return this.toResponseDto(comment, userId);
      },
      'createComment',
      { storyId },
    );
  }

  /**
   * Update a comment
   * CRITICAL: Only the comment author can update
   */
  async update(
    id: string,
    updateDto: UpdateCommentDto,
    userId: string,
  ): Promise<CommentResponseDto> {
    this.validateRequired(id, 'id');
    this.validateRequired(updateDto.content, 'content');
    this.validateRequired(userId, 'userId');

    return this.executeOperation(
      async () => {
        const comment = await this.prisma.comment.findUnique({
          where: { id },
        });

        if (!comment) {
          throw new CommentError('Comment not found');
        }

        // CRITICAL: Validate author
        if (comment.authorId !== userId) {
          throw new ForbiddenException(
            'You can only update your own comments',
          );
        }

        const updated = await this.prisma.comment.update({
          where: { id },
          data: {
            content: updateDto.content,
          },
        });

        return this.toResponseDto(updated, userId);
      },
      'updateComment',
      { commentId: id },
    );
  }

  /**
   * Delete a comment
   * CRITICAL: Only the comment author can delete
   */
  async remove(id: string, userId: string): Promise<{ success: boolean }> {
    this.validateRequired(id, 'id');
    this.validateRequired(userId, 'userId');

    return this.executeOperation(
      async () => {
        const comment = await this.prisma.comment.findUnique({
          where: { id },
        });

        if (!comment) {
          throw new CommentError('Comment not found');
        }

        // CRITICAL: Validate author
        if (comment.authorId !== userId) {
          throw new ForbiddenException(
            'You can only delete your own comments',
          );
        }

        await this.prisma.comment.delete({
          where: { id },
        });

        return { success: true };
      },
      'deleteComment',
      { commentId: id },
    );
  }

  /**
   * Transform Prisma camelCase to API snake_case
   * Adds is_current_user flag
   */
  private toResponseDto(
    comment: any,
    currentUserId: string,
  ): CommentResponseDto {
    return {
      id: comment.id,
      story_id: comment.storyId,
      release_id: comment.releaseId,
      author_id: comment.authorId,
      author: comment.author,
      avatar_url: comment.avatarUrl,
      content: comment.content,
      created_at: comment.createdAt,
      updated_at: comment.updatedAt,
      is_current_user: comment.authorId === currentUserId,
    };
  }
}
