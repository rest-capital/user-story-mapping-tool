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

    return this.executeInTransaction(
      async (tx) => {
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
      { title: data.title, userId },
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

    return this.executeOperation(
      async () => {
        // Check story exists first
        const existing = await this.prisma.story.findUnique({
          where: { id: storyId },
        });

        if (!existing) {
          throw new CollaborationError('Story not found');
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
      { storyId, updates: Object.keys(data) },
    );
  }

  /**
   * Move a story to a new cell with race-condition-safe sort order
   */
  async moveStory(
    storyId: string,
    toStepId: string,
    toReleaseId: string,
    userId: string,
  ): Promise<StoryMovedResponse> {
    this.validateRequired(storyId, 'storyId');
    this.validateRequired(toStepId, 'toStepId');
    this.validateRequired(toReleaseId, 'toReleaseId');

    return this.executeInTransaction(
      async (tx) => {
        // Verify story exists
        const existing = await tx.story.findUnique({
          where: { id: storyId },
        });

        if (!existing) {
          throw new CollaborationError('Story not found');
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
      { storyId, toStepId, toReleaseId },
    );
  }

  /**
   * Delete a story via WebSocket (same cascade logic as REST API)
   */
  async deleteStory(
    storyId: string,
    userId: string,
  ): Promise<StoryDeletedResponse> {
    this.validateRequired(storyId, 'storyId');

    return this.executeInTransaction(
      async (tx) => {
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
      { storyId },
    );
  }
}
