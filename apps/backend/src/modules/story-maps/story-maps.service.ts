import { Injectable } from '@nestjs/common';
import { BaseService } from '../../common/base.service';
import { PrismaService } from '../prisma/prisma.service';
import { StoryMapError } from './errors/story-map.error';
import { CreateStoryMapDto } from './dto/create-story-map.dto';
import { UpdateStoryMapDto } from './dto/update-story-map.dto';
import { StoryMapResponseDto } from './dto/story-map-response.dto';

@Injectable()
export class StoryMapsService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected createDomainError(
    message: string,
    cause?: Error,
    context?: any,
  ): Error {
    return new StoryMapError(message, cause, context);
  }

  async create(
    createDto: CreateStoryMapDto,
    userId: string,
  ): Promise<StoryMapResponseDto> {
    this.validateRequired(createDto.name, 'name', 'StoryMap');
    this.validateRequired(userId, 'userId');

    return this.executeInTransaction(
      async (tx) => {
        // Create story map
        const storyMap = await tx.storyMap.create({
          data: {
            name: createDto.name,
            description: createDto.description || '',
            createdBy: userId,
          },
        });

        // Auto-create Unassigned release
        await tx.release.create({
          data: {
            storyMapId: storyMap.id,
            name: 'Unassigned',
            description: 'Default release for unassigned stories',
            isUnassigned: true,
            sortOrder: 0,
            createdBy: userId,
          },
        });

        return this.toResponseDto(storyMap);
      },
      'createStoryMap',
      { name: createDto.name, userId },
    );
  }

  async findAll(userId: string): Promise<StoryMapResponseDto[]> {
    this.validateRequired(userId, 'userId');

    return this.executeOperation(
      async () => {
        const storyMaps = await this.prisma.storyMap.findMany({
          where: { createdBy: userId }, // Only user's story maps
          orderBy: { createdAt: 'desc' },
        });
        return storyMaps.map((sm) => this.toResponseDto(sm));
      },
      'findAllStoryMaps',
      { userId },
    );
  }

  async findOne(id: string, userId: string): Promise<StoryMapResponseDto> {
    this.validateRequired(id, 'id');
    this.validateRequired(userId, 'userId');

    return this.executeOperation(
      async () => {
        const storyMap = await this.prisma.storyMap.findFirst({
          where: {
            id,
            createdBy: userId, // Ensure user owns this story map
          },
        });

        if (!storyMap) {
          throw new StoryMapError('Story map not found or access denied');
        }

        return this.toResponseDto(storyMap);
      },
      'findOneStoryMap',
      { id, userId },
    );
  }

  async update(
    id: string,
    updateDto: UpdateStoryMapDto,
    userId: string,
  ): Promise<StoryMapResponseDto> {
    this.validateRequired(id, 'id');
    this.validateRequired(userId, 'userId');

    return this.executeOperation(
      async () => {
        // Verify ownership
        const existing = await this.prisma.storyMap.findFirst({
          where: { id, createdBy: userId },
        });

        if (!existing) {
          throw new StoryMapError('Story map not found or access denied');
        }

        // Build update data
        const updateData: any = { updatedBy: userId };
        if (updateDto.name !== undefined) updateData.name = updateDto.name;
        if (updateDto.description !== undefined)
          updateData.description = updateDto.description;

        const storyMap = await this.prisma.storyMap.update({
          where: { id },
          data: updateData,
        });

        return this.toResponseDto(storyMap);
      },
      'updateStoryMap',
      { id, updates: Object.keys(updateDto), userId },
    );
  }

  async remove(id: string, userId: string): Promise<{ success: boolean }> {
    this.validateRequired(id, 'id');
    this.validateRequired(userId, 'userId');

    return this.executeInTransaction(
      async (tx) => {
        // Verify ownership
        const existing = await tx.storyMap.findFirst({
          where: { id, createdBy: userId },
        });

        if (!existing) {
          throw new StoryMapError('Story map not found or access denied');
        }

        // Delete (cascades to all child entities)
        await tx.storyMap.delete({ where: { id } });

        return { success: true };
      },
      'removeStoryMap',
      { id, userId },
    );
  }

  private toResponseDto(storyMap: any): StoryMapResponseDto {
    return {
      id: storyMap.id,
      name: storyMap.name,
      description: storyMap.description,
      created_at: storyMap.createdAt,
      updated_at: storyMap.updatedAt,
      created_by: storyMap.createdBy,
      updated_by: storyMap.updatedBy,
    };
  }
}
