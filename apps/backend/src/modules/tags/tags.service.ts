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
   */
  async findAll(): Promise<TagResponseDto[]> {
    return this.executeOperation(
      async () => {
        const tags = await this.prisma.tag.findMany({
          orderBy: { name: 'asc' },
        });

        return tags.map((tag) => this.toResponseDto(tag));
      },
      'findAllTags',
      {},
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
   */
  async create(createDto: CreateTagDto): Promise<TagResponseDto> {
    this.validateRequired(createDto.name, 'name');
    this.validateRequired(createDto.color, 'color');

    return this.executeOperation(
      async () => {
        // Check if tag with same name already exists
        const existing = await this.prisma.tag.findUnique({
          where: { name: createDto.name },
        });

        if (existing) {
          throw new TagError('Tag with this name already exists');
        }

        const tag = await this.prisma.tag.create({
          data: {
            name: createDto.name,
            color: createDto.color,
          },
        });

        return this.toResponseDto(tag);
      },
      'createTag',
      { name: createDto.name },
    );
  }

  /**
   * Delete a tag
   * Cascade delete removes from all stories automatically
   */
  async remove(id: string): Promise<{ success: boolean }> {
    this.validateRequired(id, 'id', 'Tag');

    return this.executeOperation(
      async () => {
        const tag = await this.prisma.tag.findUnique({
          where: { id },
        });

        if (!tag) {
          throw new TagError('Tag not found');
        }

        // Database cascade will remove from StoryTag junction table
        await this.prisma.tag.delete({
          where: { id },
        });

        return { success: true };
      },
      'deleteTag',
      { tagId: id },
    );
  }

  /**
   * Transform Prisma Tag to Response DTO
   * Maps camelCase Prisma fields to snake_case API fields
   */
  private toResponseDto(tag: any): TagResponseDto {
    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      created_at: tag.createdAt,
    };
  }
}
