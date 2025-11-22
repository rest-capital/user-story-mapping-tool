import { Injectable } from '@nestjs/common';
import { BaseService } from '../../common/base.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReleaseError } from './errors/release.error';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { ReorderReleaseDto } from './dto/reorder-release.dto';
import { ReleaseResponseDto } from './dto/release-response.dto';

@Injectable()
export class ReleasesService extends BaseService {
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
    return new ReleaseError(message, cause, context);
  }

  /**
   * Get all releases
   * Workspace-scoped: filtered by story_map_id
   */
  async findAll(storyMapId: string): Promise<ReleaseResponseDto[]> {
    this.validateRequired(storyMapId, 'storyMapId');

    return this.executeOperation(
      async () => {
        const releases = await this.prisma.release.findMany({
          where: { storyMapId },
          orderBy: { sortOrder: 'asc' },
        });

        return releases.map((release) => this.toResponseDto(release));
      },
      'findAllReleases',
      { storyMapId },
    );
  }

  /**
   * Get a single release by ID
   */
  async findOne(id: string): Promise<ReleaseResponseDto> {
    this.validateRequired(id, 'id', 'Release');

    return this.executeOperation(
      async () => {
        const release = await this.prisma.release.findUnique({
          where: { id },
        });

        if (!release) {
          throw new ReleaseError('Release not found');
        }

        return this.toResponseDto(release);
      },
      'findOneRelease',
      { releaseId: id },
    );
  }

  /**
   * Create a new release
   * Calculates next sort order automatically
   * Workspace-scoped: validates story_map_id and user access
   */
  async create(
    createDto: CreateReleaseDto,
    userId: string,
  ): Promise<ReleaseResponseDto> {
    this.validateRequired(createDto.name, 'name', 'Release');
    this.validateRequired(createDto.story_map_id, 'story_map_id', 'Release');
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
          throw new ReleaseError('Story map not found or access denied');
        }

        // Calculate next sort order within this story map (0-based for normal releases)
        let sortOrder: number;

        if (createDto.sort_order !== undefined && createDto.sort_order !== null) {
          // Use provided sort_order
          sortOrder = createDto.sort_order;
        } else {
          // Auto-calculate based on existing releases count
          const existingReleases = await this.prisma.release.count({
            where: { storyMapId: createDto.story_map_id },
          });
          sortOrder = existingReleases; // 0-based
        }

        // Create release - map snake_case API DTO to camelCase Prisma
        const release = await this.prisma.release.create({
          data: {
            storyMapId: createDto.story_map_id,
            name: createDto.name,
            description: createDto.description || '',
            startDate: createDto.start_date
              ? new Date(createDto.start_date)
              : null,
            dueDate: createDto.due_date ? new Date(createDto.due_date) : null,
            shipped: createDto.shipped ?? false,
            isUnassigned: false, // Never allow creating Unassigned via API
            sortOrder,
            createdBy: userId,
          },
        });

        return this.toResponseDto(release);
      },
      'createRelease',
      { name: createDto.name, userId },
    );
  }

  /**
   * Update a release
   * CRITICAL: Uses conditional assignment (no spread operator)
   * CRITICAL: Cannot update isUnassigned field (business rule)
   */
  async update(
    id: string,
    updateDto: UpdateReleaseDto,
    userId: string,
  ): Promise<ReleaseResponseDto> {
    this.validateRequired(id, 'id', 'Release');
    this.validateRequired(userId, 'userId');

    return this.executeOperation(
      async () => {
        // Verify release exists
        const existing = await this.prisma.release.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new ReleaseError('Release not found');
        }

        // CRITICAL: Use conditional assignment to avoid undefined overwrites
        // Map snake_case DTO to camelCase Prisma
        const updateData: any = { updatedBy: userId };
        if (updateDto.name !== undefined) updateData.name = updateDto.name;
        if (updateDto.description !== undefined)
          updateData.description = updateDto.description;
        if (updateDto.start_date !== undefined)
          updateData.startDate = updateDto.start_date
            ? new Date(updateDto.start_date)
            : null;
        if (updateDto.due_date !== undefined)
          updateData.dueDate = updateDto.due_date
            ? new Date(updateDto.due_date)
            : null;
        if (updateDto.shipped !== undefined)
          updateData.shipped = updateDto.shipped;
        if (updateDto.sort_order !== undefined)
          updateData.sortOrder = updateDto.sort_order;

        // NEVER allow updating isUnassigned (enforced here)

        const release = await this.prisma.release.update({
          where: { id },
          data: updateData,
        });

        return this.toResponseDto(release);
      },
      'updateRelease',
      { releaseId: id, updates: Object.keys(updateDto), userId },
    );
  }

  /**
   * Delete a release
   * CRITICAL: Cannot delete Unassigned release (business rule)
   * CRITICAL: Moves all stories to Unassigned FIRST (uses transaction)
   */
  async remove(id: string): Promise<{ success: boolean; stories_moved: number }> {
    this.validateRequired(id, 'id', 'Release');

    return this.executeInTransaction(
      async (tx) => {
        // Verify release exists
        const release = await tx.release.findUnique({
          where: { id },
        });

        if (!release) {
          throw new ReleaseError('Release not found');
        }

        // CRITICAL: Cannot delete Unassigned release
        if (release.isUnassigned) {
          throw new ReleaseError('Cannot delete the Unassigned release');
        }

        // CRITICAL: Find the Unassigned release to move stories to (scoped to same story map)
        const unassignedRelease = await tx.release.findFirst({
          where: {
            isUnassigned: true,
            storyMapId: release.storyMapId,
          },
        });

        if (!unassignedRelease) {
          throw new ReleaseError(
            'Unassigned release not found - cannot safely delete release',
          );
        }

        // CRITICAL: Move all stories to Unassigned FIRST
        const result = await tx.story.updateMany({
          where: { releaseId: id },
          data: { releaseId: unassignedRelease.id },
        });

        // Now safe to delete the release
        await tx.release.delete({
          where: { id },
        });

        return {
          success: true,
          stories_moved: result.count,
        };
      },
      'deleteRelease',
      { releaseId: id },
    );
  }

  /**
   * Reorder a release
   * Properly rearranges all releases to maintain sequential 0-based sort_order
   */
  async reorder(
    id: string,
    reorderDto: ReorderReleaseDto,
    userId: string,
  ): Promise<ReleaseResponseDto> {
    this.validateRequired(id, 'id', 'Release');
    this.validateRequired(userId, 'userId');
    this.validateRange(
      reorderDto.new_sort_order,
      0,
      Number.MAX_SAFE_INTEGER,
      'new_sort_order',
    );

    return this.executeInTransaction(
      async (tx) => {
        // Get the target release first to check if it's Unassigned
        const targetRelease = await tx.release.findUnique({
          where: { id },
        });

        if (!targetRelease) {
          throw new ReleaseError('Release not found');
        }

        // CRITICAL: Cannot reorder Unassigned release (business rule)
        if (targetRelease.isUnassigned) {
          throw new ReleaseError('Cannot reorder the Unassigned release');
        }

        // Fetch all releases in the same story map sorted by current sort_order
        const allReleases = await tx.release.findMany({
          where: { storyMapId: targetRelease.storyMapId },
          orderBy: { sortOrder: 'asc' },
        });

        // Find the target release index
        const targetIndex = allReleases.findIndex((r: any) => r.id === id);
        if (targetIndex === -1) {
          throw new ReleaseError('Release not found');
        }

        // Validate new position is within bounds
        if (reorderDto.new_sort_order >= allReleases.length) {
          throw new ReleaseError(
            `new_sort_order must be less than ${allReleases.length}`,
          );
        }

        // Remove target release from current position
        const [movedRelease] = allReleases.splice(targetIndex, 1);

        // Insert at new position
        allReleases.splice(reorderDto.new_sort_order, 0, movedRelease);

        // Update all releases with new sequential sort_orders
        await Promise.all(
          allReleases.map((release: any, index: number) =>
            tx.release.update({
              where: { id: release.id },
              data: {
                sortOrder: index,
                updatedBy: userId,
              },
            }),
          ),
        );

        // Return the updated target release
        const updatedRelease = await tx.release.findUnique({
          where: { id },
        });

        return this.toResponseDto(updatedRelease!);
      },
      'reorderRelease',
      { releaseId: id, newSortOrder: reorderDto.new_sort_order, userId },
    );
  }

  /**
   * Transform Prisma Release to Response DTO
   * Maps camelCase Prisma fields to snake_case API fields
   */
  private toResponseDto(release: any): ReleaseResponseDto {
    return {
      id: release.id,
      story_map_id: release.storyMapId,
      name: release.name,
      description: release.description,
      start_date: release.startDate,
      due_date: release.dueDate,
      shipped: release.shipped,
      is_unassigned: release.isUnassigned,
      sort_order: release.sortOrder,
      created_at: release.createdAt,
      updated_at: release.updatedAt,
      created_by: release.createdBy,
      updated_by: release.updatedBy,
    };
  }
}
