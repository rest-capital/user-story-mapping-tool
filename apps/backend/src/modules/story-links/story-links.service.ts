import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BaseService } from '../../common/base.service';
import { PrismaService } from '../prisma/prisma.service';
import { StoryLinkError } from './errors/story-link.error';
import { CreateStoryLinkDto } from './dto/create-story-link.dto';
import { StoryLinkResponseDto } from './dto/story-link-response.dto';

@Injectable()
export class StoryLinksService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected createDomainError(
    message: string,
    cause?: Error,
    context?: any,
  ): Error {
    return new StoryLinkError(message, cause, context);
  }

  /**
   * Create a new story link (dependency)
   * Validates that both stories exist and prevents duplicate links
   */
  async createStoryLink(
    sourceStoryId: string,
    createDto: CreateStoryLinkDto,
  ): Promise<StoryLinkResponseDto> {
    this.validateRequired(sourceStoryId, 'sourceStoryId');
    this.validateRequired(createDto.target_story_id, 'target_story_id');
    this.validateRequired(createDto.link_type, 'link_type');

    return this.executeOperation(
      async () => {
        // Validate source story exists
        const sourceStory = await this.prisma.story.findUnique({
          where: { id: sourceStoryId },
        });

        if (!sourceStory) {
          throw new NotFoundException('Source story not found');
        }

        // Validate target story exists
        const targetStory = await this.prisma.story.findUnique({
          where: { id: createDto.target_story_id },
          select: { id: true, title: true, status: true },
        });

        if (!targetStory) {
          throw new NotFoundException('Target story not found');
        }

        // Prevent self-linking
        if (sourceStoryId === createDto.target_story_id) {
          throw new BadRequestException('Cannot link a story to itself');
        }

        // Check for duplicate link
        const existingLink = await this.prisma.storyLink.findFirst({
          where: {
            sourceStoryId,
            targetStoryId: createDto.target_story_id,
            linkType: createDto.link_type,
          },
        });

        if (existingLink) {
          throw new BadRequestException(
            `Link of type ${createDto.link_type} already exists between these stories`,
          );
        }

        // Create the link
        const storyLink = await this.prisma.storyLink.create({
          data: {
            sourceStoryId,
            targetStoryId: createDto.target_story_id,
            linkType: createDto.link_type,
          },
          include: {
            targetStory: {
              select: { id: true, title: true, status: true },
            },
          },
        });

        return this.toResponseDto(storyLink);
      },
      'createStoryLink',
      { sourceStoryId, targetStoryId: createDto.target_story_id },
    );
  }

  /**
   * Delete a specific story link
   */
  async deleteStoryLink(
    sourceStoryId: string,
    targetStoryId: string,
  ): Promise<{ success: boolean }> {
    this.validateRequired(sourceStoryId, 'sourceStoryId');
    this.validateRequired(targetStoryId, 'targetStoryId');

    return this.executeOperation(
      async () => {
        // Find the link (any link type between these stories)
        const link = await this.prisma.storyLink.findFirst({
          where: {
            sourceStoryId,
            targetStoryId,
          },
        });

        if (!link) {
          throw new NotFoundException(
            'Story link not found between these stories',
          );
        }

        // Delete the link
        await this.prisma.storyLink.delete({
          where: { id: link.id },
        });

        return { success: true };
      },
      'deleteStoryLink',
      { sourceStoryId, targetStoryId },
    );
  }

  /**
   * Get all dependencies for a story
   * Returns both outgoing (dependencies) and incoming (blocked by) links
   */
  async getStoryDependencies(
    storyId: string,
  ): Promise<{
    outgoing: StoryLinkResponseDto[];
    incoming: StoryLinkResponseDto[];
  }> {
    this.validateRequired(storyId, 'storyId');

    return this.executeOperation(
      async () => {
        // Validate story exists
        const story = await this.prisma.story.findUnique({
          where: { id: storyId },
        });

        if (!story) {
          throw new NotFoundException('Story not found');
        }

        // Get outgoing links (this story depends on others / blocks others)
        const outgoingLinks = await this.prisma.storyLink.findMany({
          where: { sourceStoryId: storyId },
          include: {
            targetStory: {
              select: { id: true, title: true, status: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        });

        // Get incoming links (other stories depend on this / block this)
        const incomingLinks = await this.prisma.storyLink.findMany({
          where: { targetStoryId: storyId },
          include: {
            sourceStory: {
              select: { id: true, title: true, status: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        });

        return {
          outgoing: outgoingLinks.map((link) => this.toResponseDto(link)),
          incoming: incomingLinks.map((link) =>
            this.toResponseDto({
              ...link,
              // Swap source/target for incoming to show correct perspective
              sourceStoryId: link.sourceStoryId,
              targetStoryId: link.targetStoryId,
              targetStory: link.sourceStory,
            }),
          ),
        };
      },
      'getStoryDependencies',
      { storyId },
    );
  }

  /**
   * Transform Prisma entity to Response DTO
   * Handles bidirectional field transformation (camelCase ↔ snake_case)
   */
  private toResponseDto(storyLink: any): StoryLinkResponseDto {
    return {
      id: storyLink.id,
      source_story_id: storyLink.sourceStoryId,
      target_story_id: storyLink.targetStoryId,
      link_type: storyLink.linkType,
      created_at: storyLink.createdAt,
      target_story: storyLink.targetStory
        ? {
            id: storyLink.targetStory.id,
            title: storyLink.targetStory.title,
            status: storyLink.targetStory.status,
          }
        : undefined,
    };
  }
}
