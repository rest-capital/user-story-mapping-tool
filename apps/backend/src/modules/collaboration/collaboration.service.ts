import { Injectable } from '@nestjs/common';
import { BaseService } from '../../common/base.service';
import { PrismaService } from '../prisma/prisma.service';
import { CollaborationError } from './errors/collaboration.error';
import {
  StoryCreatedResponse,
  StoryUpdatedResponse,
  StoryMovedResponse,
  StoryDeletedResponse,
} from './types/story-responses.type';
import {
  CommentCreatedResponse,
  CommentDeletedResponse,
} from './types/comment-responses.type';
import { CreateStoryEventDto, UpdateStoryEventDto } from './dto/story-events.dto';

@Injectable()
export class CollaborationService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected createDomainError(
    message: string,
    cause?: Error,
    context?: any,
  ): Error {
    return new CollaborationError(message, cause, context);
  }

  /**
   * Check if user has access to a story map
   */
  async hasMapAccess(userId: string, mapId: string): Promise<boolean> {
    this.validateRequired(userId, 'userId');
    this.validateRequired(mapId, 'mapId');

    return this.executeOperation(
      async () => {
        const storyMap = await this.prisma.storyMap.findFirst({
          where: {
            id: mapId,
            createdBy: userId, // For now, only creator has access
          },
        });
        return !!storyMap;
      },
      'hasMapAccess',
      { userId, mapId },
    );
  }

  /**
   * Check if user can edit a story map
   */
  async canEdit(userId: string, mapId: string): Promise<boolean> {
    this.validateRequired(userId, 'userId');
    this.validateRequired(mapId, 'mapId');

    return this.executeOperation(
      async () => {
        const storyMap = await this.prisma.storyMap.findFirst({
          where: {
            id: mapId,
            createdBy: userId, // For now, creator can edit
          },
        });
        return !!storyMap;
      },
      'canEdit',
      { userId, mapId },
    );
  }

  /**
   * Create a story via WebSocket with race-condition-safe sort order
   */
  async createStory(
    data: CreateStoryEventDto,
    userId: string,
  ): Promise<StoryCreatedResponse> {
    this.validateRequired(data.title, 'title', 'Story');
    this.validateRequired(data.step_id, 'step_id', 'Story');
    this.validateRequired(data.release_id, 'release_id', 'Story');
    this.validateRequired(data.mapId, 'mapId', 'Story');

    return this.executeInTransaction(
      async (tx) => {
        // SECURITY: Validate that step belongs to the specified map
        const step = await tx.step.findUnique({
          where: { id: data.step_id },
          include: {
            journey: {
              select: { storyMapId: true },
            },
          },
        });

        if (!step) {
          throw new CollaborationError('Step not found');
        }

        if (step.journey.storyMapId !== data.mapId) {
          throw new CollaborationError(
            'Step does not belong to the specified map',
          );
        }

        // SECURITY: Validate that release belongs to the specified map
        const release = await tx.release.findUnique({
          where: { id: data.release_id },
          select: { storyMapId: true },
        });

        if (!release) {
          throw new CollaborationError('Release not found');
        }

        if (release.storyMapId !== data.mapId) {
          throw new CollaborationError(
            'Release does not belong to the specified map',
          );
        }

        // Calculate sort order in transaction to avoid race conditions
        const existingStories = await tx.story.count({
          where: {
            stepId: data.step_id,
            releaseId: data.release_id,
          },
        });

        const sortOrder = (existingStories + 1) * 1000;

        const story = await tx.story.create({
          data: {
            stepId: data.step_id,
            releaseId: data.release_id,
            title: data.title,
            description: data.description || '',
            status: data.status || 'NOT_READY',
            size: data.size || null,
            sortOrder,
            createdBy: userId,
          },
        });

        return {
          id: story.id,
          step_id: story.stepId,
          release_id: story.releaseId,
          title: story.title,
          description: story.description,
          status: story.status,
          size: story.size,
          sort_order: story.sortOrder,
          created_at: story.createdAt,
          created_by: story.createdBy,
        };
      },
      'createStoryViaWebSocket',
      { title: data.title, userId, mapId: data.mapId },
    );
  }

  /**
   * Update a story via WebSocket
   */
  async updateStory(
    storyId: string,
    data: Partial<UpdateStoryEventDto>,
    userId: string,
  ): Promise<StoryUpdatedResponse> {
    this.validateRequired(storyId, 'storyId');
    this.validateRequired(data.mapId, 'mapId', 'UpdateStory');

    return this.executeOperation(
      async () => {
        // SECURITY: Check story exists and belongs to the specified map
        const existing = await this.prisma.story.findUnique({
          where: { id: storyId },
          include: {
            step: {
              include: {
                journey: {
                  select: { storyMapId: true },
                },
              },
            },
          },
        });

        if (!existing) {
          throw new CollaborationError('Story not found');
        }

        if (existing.step.journey.storyMapId !== data.mapId) {
          throw new CollaborationError(
            'Story does not belong to the specified map',
          );
        }

        const updateData: any = { updatedBy: userId };

        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined)
          updateData.description = data.description;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.size !== undefined) updateData.size = data.size;

        const story = await this.prisma.story.update({
          where: { id: storyId },
          data: updateData,
        });

        return {
          id: story.id,
          title: story.title,
          description: story.description,
          status: story.status,
          size: story.size,
          updated_at: story.updatedAt,
          updated_by: story.updatedBy,
        };
      },
      'updateStoryViaWebSocket',
      { storyId, updates: Object.keys(data), mapId: data.mapId },
    );
  }

  /**
   * Move a story to a new cell with race-condition-safe sort order
   */
  async moveStory(
    storyId: string,
    toStepId: string,
    toReleaseId: string,
    mapId: string,
    userId: string,
  ): Promise<StoryMovedResponse> {
    this.validateRequired(storyId, 'storyId');
    this.validateRequired(toStepId, 'toStepId');
    this.validateRequired(toReleaseId, 'toReleaseId');
    this.validateRequired(mapId, 'mapId');

    return this.executeInTransaction(
      async (tx) => {
        // SECURITY: Verify story exists and belongs to the specified map
        const existing = await tx.story.findUnique({
          where: { id: storyId },
          include: {
            step: {
              include: {
                journey: {
                  select: { storyMapId: true },
                },
              },
            },
          },
        });

        if (!existing) {
          throw new CollaborationError('Story not found');
        }

        if (existing.step.journey.storyMapId !== mapId) {
          throw new CollaborationError(
            'Story does not belong to the specified map',
          );
        }

        // SECURITY: Validate destination step belongs to the specified map
        const toStep = await tx.step.findUnique({
          where: { id: toStepId },
          include: {
            journey: {
              select: { storyMapId: true },
            },
          },
        });

        if (!toStep) {
          throw new CollaborationError('Destination step not found');
        }

        if (toStep.journey.storyMapId !== mapId) {
          throw new CollaborationError(
            'Destination step does not belong to the specified map',
          );
        }

        // SECURITY: Validate destination release belongs to the specified map
        const toRelease = await tx.release.findUnique({
          where: { id: toReleaseId },
          select: { storyMapId: true },
        });

        if (!toRelease) {
          throw new CollaborationError('Destination release not found');
        }

        if (toRelease.storyMapId !== mapId) {
          throw new CollaborationError(
            'Destination release does not belong to the specified map',
          );
        }

        // Calculate new sort order in transaction
        const storiesInNewCell = await tx.story.count({
          where: {
            stepId: toStepId,
            releaseId: toReleaseId,
          },
        });

        const newSortOrder = (storiesInNewCell + 1) * 1000;

        const story = await tx.story.update({
          where: { id: storyId },
          data: {
            stepId: toStepId,
            releaseId: toReleaseId,
            sortOrder: newSortOrder,
            updatedBy: userId,
          },
        });

        return {
          id: story.id,
          step_id: story.stepId,
          release_id: story.releaseId,
          sort_order: story.sortOrder,
          updated_at: story.updatedAt,
          updated_by: story.updatedBy,
        };
      },
      'moveStoryViaWebSocket',
      { storyId, toStepId, toReleaseId, mapId },
    );
  }

  /**
   * Delete a story via WebSocket (same cascade logic as REST API)
   */
  async deleteStory(
    storyId: string,
    mapId: string,
    userId: string,
  ): Promise<StoryDeletedResponse> {
    this.validateRequired(storyId, 'storyId');
    this.validateRequired(mapId, 'mapId');

    return this.executeInTransaction(
      async (tx) => {
        // SECURITY: Verify story exists and belongs to the specified map
        const existing = await tx.story.findUnique({
          where: { id: storyId },
          include: {
            step: {
              include: {
                journey: {
                  select: { storyMapId: true },
                },
              },
            },
          },
        });

        if (!existing) {
          throw new CollaborationError('Story not found');
        }

        if (existing.step.journey.storyMapId !== mapId) {
          throw new CollaborationError(
            'Story does not belong to the specified map',
          );
        }

        // Delete in correct order (same as REST API)
        await tx.storyLink.deleteMany({
          where: {
            OR: [{ sourceStoryId: storyId }, { targetStoryId: storyId }],
          },
        });

        await tx.storyTag.deleteMany({ where: { storyId } });
        await tx.storyPersona.deleteMany({ where: { storyId } });
        await tx.comment.deleteMany({ where: { storyId } });
        await tx.attachment.deleteMany({ where: { storyId } });

        await tx.story.delete({ where: { id: storyId } });

        return {
          id: storyId,
          deleted_by: userId,
          deleted_at: new Date(),
        };
      },
      'deleteStoryViaWebSocket',
      { storyId, mapId },
    );
  }

  /**
   * Create a comment via WebSocket
   */
  async createComment(
    storyId: string,
    mapId: string,
    content: string,
    userId: string,
    userName: string,
    avatarUrl: string | null,
  ): Promise<CommentCreatedResponse> {
    this.validateRequired(storyId, 'storyId');
    this.validateRequired(mapId, 'mapId');
    this.validateRequired(content, 'content');
    this.validateRequired(userId, 'userId');

    return this.executeOperation(
      async () => {
        // SECURITY: Validate that story belongs to the specified map
        const story = await this.prisma.story.findUnique({
          where: { id: storyId },
          include: {
            step: {
              include: {
                journey: {
                  select: { storyMapId: true },
                },
              },
            },
          },
        });

        if (!story) {
          throw new CollaborationError('Story not found');
        }

        if (story.step.journey.storyMapId !== mapId) {
          throw new CollaborationError(
            'Story does not belong to the specified map',
          );
        }

        const comment = await this.prisma.comment.create({
          data: {
            storyId,
            content,
            authorId: userId,
            author: userName,
            avatarUrl: avatarUrl,
          },
        });

        return {
          id: comment.id,
          story_id: comment.storyId,
          content: comment.content,
          author: comment.author,
          author_id: comment.authorId,
          avatar_url: comment.avatarUrl,
          created_at: comment.createdAt,
        };
      },
      'createCommentViaWebSocket',
      { storyId, mapId, userId },
    );
  }

  /**
   * Delete a comment via WebSocket
   */
  async deleteComment(
    commentId: string,
    mapId: string,
    userId: string,
  ): Promise<CommentDeletedResponse> {
    this.validateRequired(commentId, 'commentId');
    this.validateRequired(mapId, 'mapId');

    return this.executeOperation(
      async () => {
        // SECURITY: Verify comment exists, user is author, and story belongs to map
        const comment = await this.prisma.comment.findUnique({
          where: { id: commentId },
          include: {
            story: {
              include: {
                step: {
                  include: {
                    journey: {
                      select: { storyMapId: true },
                    },
                  },
                },
              },
            },
          },
        });

        if (!comment) {
          throw new CollaborationError('Comment not found');
        }

        if (comment.authorId !== userId) {
          throw new CollaborationError('Only comment author can delete');
        }

        if (comment.story && comment.story.step.journey.storyMapId !== mapId) {
          throw new CollaborationError(
            'Comment does not belong to the specified map',
          );
        }

        await this.prisma.comment.delete({
          where: { id: commentId },
        });

        return {
          id: commentId,
          story_id: comment.storyId,
        };
      },
      'deleteCommentViaWebSocket',
      { commentId, mapId, userId },
    );
  }
}
