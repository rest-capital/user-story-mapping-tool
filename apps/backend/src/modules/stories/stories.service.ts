import { Injectable } from '@nestjs/common';
import { BaseService } from '../../common/base.service';
import { PrismaService } from '../prisma/prisma.service';
import { StoryError } from './errors/story.error';
import { CreateStoryDto, StoryStatus } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { MoveStoryDto } from './dto/move-story.dto';
import { StoryResponseDto } from './dto/story-response.dto';

@Injectable()
export class StoriesService extends BaseService {
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
    return new StoryError(message, cause, context);
  }

  /**
   * Get all stories
   */
  async findAll(): Promise<StoryResponseDto[]> {
    return this.executeOperation(
      async () => {
        const stories = await this.prisma.story.findMany({
          orderBy: [
            { stepId: 'asc' },
            { releaseId: 'asc' },
            { sortOrder: 'asc' },
          ],
        });

        return stories.map((story) => this.toResponseDto(story));
      },
      'findAllStories',
      {},
    );
  }

  /**
   * Get a single story by ID
   */
  async findOne(id: string): Promise<StoryResponseDto> {
    this.validateRequired(id, 'id', 'Story');

    return this.executeOperation(
      async () => {
        const story = await this.prisma.story.findUnique({
          where: { id },
          include: {
            sourceLinks: {
              include: {
                targetStory: {
                  select: { id: true, title: true, status: true },
                },
              },
            },
          },
        });

        if (!story) {
          throw new StoryError('Story not found');
        }

        return this.toResponseDto(story);
      },
      'findOneStory',
      { storyId: id },
    );
  }

  /**
   * Get all stories for a specific step (across all releases)
   */
  async findByStepId(stepId: string): Promise<StoryResponseDto[]> {
    this.validateRequired(stepId, 'stepId');

    return this.executeOperation(
      async () => {
        // Validate step exists
        const step = await this.prisma.step.findUnique({
          where: { id: stepId },
        });

        if (!step) {
          throw new StoryError('Step not found');
        }

        const stories = await this.prisma.story.findMany({
          where: { stepId },
          orderBy: [{ releaseId: 'asc' }, { sortOrder: 'asc' }],
        });

        return stories.map((story) => this.toResponseDto(story));
      },
      'findStoriesByStepId',
      { stepId },
    );
  }

  /**
   * Get all stories for a specific release (across all steps)
   */
  async findByReleaseId(releaseId: string): Promise<StoryResponseDto[]> {
    this.validateRequired(releaseId, 'releaseId');

    return this.executeOperation(
      async () => {
        // Validate release exists
        const release = await this.prisma.release.findUnique({
          where: { id: releaseId },
        });

        if (!release) {
          throw new StoryError('Release not found');
        }

        const stories = await this.prisma.story.findMany({
          where: { releaseId },
          orderBy: [{ stepId: 'asc' }, { sortOrder: 'asc' }],
        });

        return stories.map((story) => this.toResponseDto(story));
      },
      'findStoriesByReleaseId',
      { releaseId },
    );
  }

  /**
   * Get all stories for a specific cell (step + release)
   */
  async findByCell(stepId: string, releaseId: string): Promise<StoryResponseDto[]> {
    this.validateRequired(stepId, 'stepId');
    this.validateRequired(releaseId, 'releaseId');

    return this.executeOperation(
      async () => {
        // Validate step exists
        const step = await this.prisma.step.findUnique({
          where: { id: stepId },
        });

        if (!step) {
          throw new StoryError('Step not found');
        }

        // Validate release exists
        const release = await this.prisma.release.findUnique({
          where: { id: releaseId },
        });

        if (!release) {
          throw new StoryError('Release not found');
        }

        const stories = await this.prisma.story.findMany({
          where: {
            stepId,
            releaseId,
          },
          orderBy: { sortOrder: 'asc' },
        });

        return stories.map((story) => this.toResponseDto(story));
      },
      'findStoriesByCell',
      { stepId, releaseId },
    );
  }

  /**
   * Create a new story with proper sort order (1000-based)
   */
  async create(
    createDto: CreateStoryDto,
    userId: string,
  ): Promise<StoryResponseDto> {
    this.validateRequired(createDto.step_id, 'step_id');
    this.validateRequired(createDto.release_id, 'release_id');
    this.validateRequired(createDto.title, 'title');

    return this.executeOperation(
      async () => {
        // Validate that step and release exist
        const step = await this.prisma.step.findUnique({
          where: { id: createDto.step_id },
        });

        if (!step) {
          throw new StoryError('Step not found');
        }

        const release = await this.prisma.release.findUnique({
          where: { id: createDto.release_id },
        });

        if (!release) {
          throw new StoryError('Release not found');
        }

        // CRITICAL: Calculate next sort_order (1000-based spacing)
        const existingStories = await this.prisma.story.count({
          where: {
            stepId: createDto.step_id,
            releaseId: createDto.release_id,
          },
        });

        // Stories use 1000-based spacing: 1000, 2000, 3000...
        const sortOrder = (existingStories + 1) * 1000;

        // Create story with defaults
        const story = await this.prisma.story.create({
          data: {
            stepId: createDto.step_id,
            releaseId: createDto.release_id,
            title: createDto.title,
            description: createDto.description || '',
            status: createDto.status || StoryStatus.NOT_READY,
            size: createDto.size || null,
            sortOrder,
            // Default label
            labelId: null,
            labelName: 'Story',
            labelColor: '#3B82F6',
            createdBy: userId,
          },
        });

        return this.toResponseDto(story);
      },
      'createStory',
      { stepId: createDto.step_id, releaseId: createDto.release_id },
    );
  }

  /**
   * Update story with validation and field transformation
   */
  async update(
    id: string,
    updateDto: UpdateStoryDto,
    userId: string,
  ): Promise<StoryResponseDto> {
    this.validateRequired(id, 'id', 'Story');

    return this.executeOperation(
      async () => {
        const story = await this.prisma.story.findUnique({
          where: { id },
        });

        if (!story) {
          throw new StoryError('Story not found');
        }

        // CRITICAL: Conditional assignment to prevent undefined overwrites
        // Transform snake_case DTO → camelCase Prisma
        const updateData: any = { updatedBy: userId };

        if (updateDto.title !== undefined) updateData.title = updateDto.title;
        if (updateDto.description !== undefined)
          updateData.description = updateDto.description;
        if (updateDto.status !== undefined)
          updateData.status = updateDto.status;
        if (updateDto.size !== undefined) updateData.size = updateDto.size;

        // Handle moving to different cell
        if (updateDto.step_id !== undefined) {
          // Validate step exists
          const step = await this.prisma.step.findUnique({
            where: { id: updateDto.step_id },
          });
          if (!step) {
            throw new StoryError('Target step not found');
          }
          updateData.stepId = updateDto.step_id;
        }

        if (updateDto.release_id !== undefined) {
          // Validate release exists
          const release = await this.prisma.release.findUnique({
            where: { id: updateDto.release_id },
          });
          if (!release) {
            throw new StoryError('Target release not found');
          }
          updateData.releaseId = updateDto.release_id;
        }

        // If moving to a new cell, recalculate sort order
        if (updateDto.step_id || updateDto.release_id) {
          const newStepId = updateDto.step_id || story.stepId;
          const newReleaseId = updateDto.release_id || story.releaseId;

          const storiesInNewCell = await this.prisma.story.count({
            where: {
              stepId: newStepId,
              releaseId: newReleaseId,
            },
          });

          updateData.sortOrder = (storiesInNewCell + 1) * 1000;
        } else if (updateDto.sort_order !== undefined) {
          // Manual reorder within same cell
          updateData.sortOrder = updateDto.sort_order;
        }

        const updatedStory = await this.prisma.story.update({
          where: { id },
          data: updateData,
        });

        return this.toResponseDto(updatedStory);
      },
      'updateStory',
      { storyId: id },
    );
  }

  /**
   * CRITICAL: Delete story with dependency cleanup
   * Must handle all relationships in correct order using transaction
   */
  async remove(id: string): Promise<{ success: boolean; dependencies_removed: number }> {
    this.validateRequired(id, 'id', 'Story');

    return this.executeInTransaction(
      async (tx) => {
        // Verify story exists
        const story = await tx.story.findUnique({
          where: { id },
        });

        if (!story) {
          throw new StoryError('Story not found');
        }

        // CRITICAL: Delete in correct order to handle foreign keys

        // 1. Delete StoryLink records (both source and target)
        const deletedLinks = await tx.storyLink.deleteMany({
          where: {
            OR: [
              { sourceStoryId: id },
              { targetStoryId: id },
            ],
          },
        });

        // 2. Delete StoryTag junction records
        await tx.storyTag.deleteMany({
          where: { storyId: id },
        });

        // 3. Delete StoryPersona junction records
        await tx.storyPersona.deleteMany({
          where: { storyId: id },
        });

        // 4. Delete Comment records
        await tx.comment.deleteMany({
          where: { storyId: id },
        });

        // 5. Delete Attachment records
        await tx.attachment.deleteMany({
          where: { storyId: id },
        });

        // 6. Finally delete the story itself
        await tx.story.delete({
          where: { id },
        });

        return {
          success: true,
          dependencies_removed: deletedLinks.count,
        };
      },
      'deleteStory',
      { storyId: id },
    );
  }

  /**
   * Move a story to a different cell (step + release)
   * Dedicated endpoint for moving stories with automatic sort_order recalculation
   */
  async move(
    id: string,
    moveDto: MoveStoryDto,
    userId: string,
  ): Promise<StoryResponseDto> {
    this.validateRequired(id, 'id', 'Story');
    this.validateRequired(userId, 'userId');

    // At least one of step_id or release_id must be provided
    if (!moveDto.step_id && !moveDto.release_id) {
      throw new StoryError(
        'At least one of step_id or release_id must be provided to move a story',
      );
    }

    return this.executeOperation(
      async () => {
        // Verify story exists and get current workspace context
        const story = await this.prisma.story.findUnique({
          where: { id },
          include: {
            step: {
              include: {
                journey: true,
              },
            },
            release: true,
          },
        });

        if (!story) {
          throw new StoryError('Story not found');
        }

        // Get current story map ID for workspace validation
        const currentStoryMapId = story.step.journey.storyMapId;

        // Determine new cell coordinates
        const newStepId = moveDto.step_id || story.stepId;
        const newReleaseId = moveDto.release_id || story.releaseId;

        // Validate new step exists and belongs to same story map (if changing)
        if (moveDto.step_id) {
          const step = await this.prisma.step.findUnique({
            where: { id: moveDto.step_id },
            include: {
              journey: true,
            },
          });
          if (!step) {
            throw new StoryError('Target step not found');
          }

          // CRITICAL: Validate workspace isolation
          if (step.journey.storyMapId !== currentStoryMapId) {
            throw new StoryError(
              'Cannot move story to step from different story map',
            );
          }
        }

        // Validate new release exists and belongs to same story map (if changing)
        if (moveDto.release_id) {
          const release = await this.prisma.release.findUnique({
            where: { id: moveDto.release_id },
          });
          if (!release) {
            throw new StoryError('Target release not found');
          }

          // CRITICAL: Validate workspace isolation
          if (release.storyMapId !== currentStoryMapId) {
            throw new StoryError(
              'Cannot move story to release from different story map',
            );
          }
        }

        // Calculate new sort_order for the target cell
        const storiesInNewCell = await this.prisma.story.count({
          where: {
            stepId: newStepId,
            releaseId: newReleaseId,
          },
        });

        const newSortOrder = (storiesInNewCell + 1) * 1000;

        // Move the story
        const movedStory = await this.prisma.story.update({
          where: { id },
          data: {
            stepId: newStepId,
            releaseId: newReleaseId,
            sortOrder: newSortOrder,
            updatedBy: userId,
          },
        });

        return this.toResponseDto(movedStory);
      },
      'moveStory',
      { storyId: id, newStepId: moveDto.step_id, newReleaseId: moveDto.release_id, userId },
    );
  }

  /**
   * Transform Prisma Story to Response DTO
   * Maps camelCase Prisma fields to snake_case API fields
   */
  private toResponseDto(story: any): StoryResponseDto {
    return {
      id: story.id,
      step_id: story.stepId,
      release_id: story.releaseId,
      title: story.title,
      description: story.description,
      status: story.status,
      size: story.size,
      label_id: story.labelId,
      label_name: story.labelName,
      label_color: story.labelColor,
      sort_order: story.sortOrder,
      created_at: story.createdAt,
      updated_at: story.updatedAt,
      created_by: story.createdBy,
      updated_by: story.updatedBy,
      // Include dependencies if they were fetched
      dependencies: story.sourceLinks
        ? story.sourceLinks.map((link: any) => ({
            id: link.id,
            source_story_id: link.sourceStoryId,
            target_story_id: link.targetStoryId,
            link_type: link.linkType,
            created_at: link.createdAt,
            target_story: link.targetStory
              ? {
                  id: link.targetStory.id,
                  title: link.targetStory.title,
                  status: link.targetStory.status,
                }
              : undefined,
          }))
        : undefined,
    };
  }

  /**
   * Add a tag to a story
   */
  async addTagToStory(storyId: string, tagId: string): Promise<{ success: boolean }> {
    this.validateRequired(storyId, 'storyId');
    this.validateRequired(tagId, 'tagId');

    return this.executeOperation(
      async () => {
        // Verify story exists
        const story = await this.prisma.story.findUnique({
          where: { id: storyId },
        });

        if (!story) {
          throw new StoryError('Story not found');
        }

        // Verify tag exists
        const tag = await this.prisma.tag.findUnique({
          where: { id: tagId },
        });

        if (!tag) {
          throw new StoryError('Tag not found');
        }

        // Check if already associated
        const existing = await this.prisma.storyTag.findUnique({
          where: {
            storyId_tagId: {
              storyId,
              tagId,
            },
          },
        });

        if (existing) {
          throw new StoryError('Tag already associated with this story');
        }

        // Create association
        await this.prisma.storyTag.create({
          data: {
            storyId,
            tagId,
          },
        });

        return { success: true };
      },
      'addTagToStory',
      { storyId, tagId },
    );
  }

  /**
   * Get all tags for a story
   */
  async getStoryTags(storyId: string): Promise<any[]> {
    this.validateRequired(storyId, 'storyId');

    return this.executeOperation(
      async () => {
        // Verify story exists
        const story = await this.prisma.story.findUnique({
          where: { id: storyId },
        });

        if (!story) {
          throw new StoryError('Story not found');
        }

        // Get tags
        const storyTags = await this.prisma.storyTag.findMany({
          where: { storyId },
          include: {
            tag: true,
          },
        });

        return storyTags.map((st) => ({
          id: st.tag.id,
          name: st.tag.name,
          created_at: st.tag.createdAt,
        }));
      },
      'getStoryTags',
      { storyId },
    );
  }

  /**
   * Add a persona to a story
   */
  async addPersonaToStory(
    storyId: string,
    personaId: string,
  ): Promise<{ success: boolean }> {
    this.validateRequired(storyId, 'storyId');
    this.validateRequired(personaId, 'personaId');

    return this.executeOperation(
      async () => {
        // Verify story exists
        const story = await this.prisma.story.findUnique({
          where: { id: storyId },
        });

        if (!story) {
          throw new StoryError('Story not found');
        }

        // Verify persona exists
        const persona = await this.prisma.persona.findUnique({
          where: { id: personaId },
        });

        if (!persona) {
          throw new StoryError('Persona not found');
        }

        // Check if already associated
        const existing = await this.prisma.storyPersona.findUnique({
          where: {
            storyId_personaId: {
              storyId,
              personaId,
            },
          },
        });

        if (existing) {
          throw new StoryError('Persona already associated with this story');
        }

        // Create association
        await this.prisma.storyPersona.create({
          data: {
            storyId,
            personaId,
          },
        });

        return { success: true };
      },
      'addPersonaToStory',
      { storyId, personaId },
    );
  }

  /**
   * Get all personas for a story
   */
  async getStoryPersonas(storyId: string): Promise<any[]> {
    this.validateRequired(storyId, 'storyId');

    return this.executeOperation(
      async () => {
        // Verify story exists
        const story = await this.prisma.story.findUnique({
          where: { id: storyId },
        });

        if (!story) {
          throw new StoryError('Story not found');
        }

        // Get personas
        const storyPersonas = await this.prisma.storyPersona.findMany({
          where: { storyId },
          include: {
            persona: true,
          },
        });

        return storyPersonas.map((sp) => ({
          id: sp.persona.id,
          name: sp.persona.name,
          description: sp.persona.description,
          avatar_url: sp.persona.avatarUrl,
          created_at: sp.persona.createdAt,
        }));
      },
      'getStoryPersonas',
      { storyId },
    );
  }
}
