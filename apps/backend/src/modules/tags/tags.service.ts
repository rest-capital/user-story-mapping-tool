import { Injectable } from '@nestjs/common';
import { BaseService } from '../../common/base.service';
import { PrismaService } from '../prisma/prisma.service';
import { TagError } from './errors/tag.error';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagResponseDto } from './dto/tag-response.dto';

@Injectable()
export class TagsService extends BaseService {
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
    return new TagError(message, cause, context);
  }

  /**
   * Get all tags
   * Workspace-scoped: filtered by story_map_id
   */
  async findAll(storyMapId: string): Promise<TagResponseDto[]> {
    this.validateRequired(storyMapId, 'storyMapId');

    return this.executeOperation(
      async () => {
        const tags = await this.prisma.tag.findMany({
          where: { storyMapId },
          orderBy: { name: 'asc' },
        });

        return tags.map((tag) => this.toResponseDto(tag));
      },
      'findAllTags',
      { storyMapId },
    );
  }

  /**
   * Get a single tag by ID
   */
  async findOne(id: string): Promise<TagResponseDto> {
    this.validateRequired(id, 'id', 'Tag');

    return this.executeOperation(
      async () => {
        const tag = await this.prisma.tag.findUnique({
          where: { id },
        });

        if (!tag) {
          throw new TagError('Tag not found');
        }

        return this.toResponseDto(tag);
      },
      'findOneTag',
      { tagId: id },
    );
  }

  /**
   * Create a new tag
   * Workspace-scoped: validates story_map_id and checks uniqueness within story map
   */
  async create(createDto: CreateTagDto, userId: string): Promise<TagResponseDto> {
    this.validateRequired(createDto.name, 'name');
    this.validateRequired(createDto.story_map_id, 'story_map_id', 'Tag');
    this.validateRequired(userId, 'userId');

    return this.executeOperation(
      async () => {
        // Verify story map exists and user has access
        const storyMap = await this.prisma.storyMap.findFirst({
          where: {
            id: createDto.story_map_id,
            createdBy: userId,
          },
        });

        if (!storyMap) {
          throw new TagError('Story map not found or access denied');
        }

        // Check if tag with same name already exists in this story map
        const existing = await this.prisma.tag.findUnique({
          where: {
            storyMapId_name: {
              storyMapId: createDto.story_map_id,
              name: createDto.name,
            },
          },
        });

        if (existing) {
          throw new TagError('Tag with this name already exists in this story map');
        }

        const tag = await this.prisma.tag.create({
          data: {
            storyMapId: createDto.story_map_id,
            name: createDto.name,
            createdBy: userId,
          },
        });

        return this.toResponseDto(tag);
      },
      'createTag',
      { name: createDto.name, storyMapId: createDto.story_map_id, userId },
    );
  }

  /**
   * Delete a tag
   * Cascade delete removes from all stories automatically
   */
  async remove(id: string, storyMapId: string): Promise<{ success: boolean }> {
    this.validateRequired(id, 'id', 'Tag');
    this.validateRequired(storyMapId, 'storyMapId', 'Tag');

    return this.executeOperation(
      async () => {
        const tag = await this.prisma.tag.findUnique({
          where: { id },
        });

        if (!tag) {
          throw new TagError('Tag not found');
        }

        // CRITICAL: Validate workspace ownership
        if (tag.storyMapId !== storyMapId) {
          throw new TagError('Tag not found');
        }

        // Database cascade will remove from StoryTag junction table
        await this.prisma.tag.delete({
          where: { id },
        });

        return { success: true };
      },
      'deleteTag',
      { tagId: id, storyMapId },
    );
  }

  /**
   * Transform Prisma Tag to Response DTO
   * Maps camelCase Prisma fields to snake_case API fields
   */
  private toResponseDto(tag: any): TagResponseDto {
    return {
      id: tag.id,
      story_map_id: tag.storyMapId,
      name: tag.name,
      created_at: tag.createdAt,
    };
  }
}
