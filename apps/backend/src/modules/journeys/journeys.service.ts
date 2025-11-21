import { Injectable } from '@nestjs/common';
import { BaseService } from '../../common/base.service';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyError } from './errors/journey.error';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { UpdateJourneyDto } from './dto/update-journey.dto';
import { ReorderJourneyDto } from './dto/reorder-journey.dto';
import { JourneyResponseDto } from './dto/journey-response.dto';

/**
 * Service for Journey business logic
 * Extends BaseService for automatic error handling, logging, and transactions
 */
@Injectable()
export class JourneysService extends BaseService {
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
    return new JourneyError(message, cause, context);
  }

  /**
   * Create a new journey
   * Auto-generates sort_order, sets defaults
   */
  async create(
    createDto: CreateJourneyDto,
    userId: string,
  ): Promise<JourneyResponseDto> {
    this.validateRequired(createDto.name, 'name', 'Journey');
    this.validateRequired(userId, 'userId');

    return this.executeOperation(
      async () => {
        // Business rule: Calculate next sort_order (0-based increment)
        const existingCount = await this.prisma.journey.count();
        const sortOrder = existingCount; // 0, 1, 2, 3...

        // Create journey with defaults
        const journey = await this.prisma.journey.create({
          data: {
            name: createDto.name,
            description: createDto.description || '',
            color: createDto.color || '#8B5CF6',
            sortOrder,
            createdBy: userId,
          },
        });

        return this.toResponseDto(journey);
      },
      'createJourney',
      { name: createDto.name, userId },
    );
  }

  /**
   * Get all journeys sorted by sort_order
   */
  async findAll(): Promise<JourneyResponseDto[]> {
    return this.executeOperation(
      async () => {
        const journeys = await this.prisma.journey.findMany({
          orderBy: { sortOrder: 'asc' },
        });

        return journeys.map((journey) => this.toResponseDto(journey));
      },
      'findAllJourneys',
    );
  }

  /**
   * Get a single journey by ID
   */
  async findOne(id: string): Promise<JourneyResponseDto> {
    this.validateRequired(id, 'id', 'Journey');

    return this.executeOperation(
      async () => {
        const journey = await this.prisma.journey.findUnique({
          where: { id },
        });

        if (!journey) {
          throw new JourneyError('Journey not found');
        }

        return this.toResponseDto(journey);
      },
      'findJourneyById',
      { journeyId: id },
    );
  }

  /**
   * Update a journey
   * Supports partial updates (PATCH semantics)
   */
  async update(
    id: string,
    updateDto: UpdateJourneyDto,
    userId: string,
  ): Promise<JourneyResponseDto> {
    this.validateRequired(id, 'id', 'Journey');
    this.validateRequired(userId, 'userId');

    return this.executeOperation(
      async () => {
        // Verify journey exists
        const existing = await this.prisma.journey.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new JourneyError('Journey not found');
        }

        // Update journey - map snake_case DTO to camelCase Prisma
        const updateData: any = { updatedBy: userId };
        if (updateDto.name !== undefined) updateData.name = updateDto.name;
        if (updateDto.description !== undefined)
          updateData.description = updateDto.description;
        if (updateDto.color !== undefined) updateData.color = updateDto.color;
        if (updateDto.sort_order !== undefined)
          updateData.sortOrder = updateDto.sort_order;

        const journey = await this.prisma.journey.update({
          where: { id },
          data: updateData,
        });

        return this.toResponseDto(journey);
      },
      'updateJourney',
      { journeyId: id, updates: Object.keys(updateDto), userId },
    );
  }

  /**
   * Delete a journey
   * CRITICAL: Cascades to steps and stories
   */
  async remove(id: string): Promise<{ success: boolean }> {
    this.validateRequired(id, 'id', 'Journey');

    return this.executeOperation(
      async () => {
        // Verify journey exists
        const existing = await this.prisma.journey.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new JourneyError('Journey not found');
        }

        // Delete journey (cascades to steps and stories via Prisma schema)
        await this.prisma.journey.delete({
          where: { id },
        });

        return { success: true };
      },
      'deleteJourney',
      { journeyId: id },
    );
  }

  /**
   * Reorder a journey
   * Properly rearranges all journeys to maintain sequential 0-based sort_order
   */
  async reorder(
    id: string,
    reorderDto: ReorderJourneyDto,
    userId: string,
  ): Promise<JourneyResponseDto> {
    this.validateRequired(id, 'id', 'Journey');
    this.validateRequired(userId, 'userId');
    this.validateRange(
      reorderDto.new_sort_order,
      0,
      Number.MAX_SAFE_INTEGER,
      'new_sort_order',
    );

    return this.executeInTransaction(
      async (tx) => {
        // Fetch all journeys sorted by current sort_order
        const allJourneys = await tx.journey.findMany({
          orderBy: { sortOrder: 'asc' },
        });

        // Find the target journey
        const targetIndex = allJourneys.findIndex((j: any) => j.id === id);
        if (targetIndex === -1) {
          throw new JourneyError('Journey not found');
        }

        // Validate new position is within bounds
        if (reorderDto.new_sort_order >= allJourneys.length) {
          throw new JourneyError(
            `new_sort_order must be less than ${allJourneys.length}`,
          );
        }

        // Remove target journey from current position
        const [targetJourney] = allJourneys.splice(targetIndex, 1);

        // Insert at new position
        allJourneys.splice(reorderDto.new_sort_order, 0, targetJourney);

        // Update all journeys with new sequential sort_orders
        await Promise.all(
          allJourneys.map((journey: any, index: number) =>
            tx.journey.update({
              where: { id: journey.id },
              data: {
                sortOrder: index,
                updatedBy: userId,
              },
            }),
          ),
        );

        // Return the updated target journey
        const updatedJourney = await tx.journey.findUnique({
          where: { id },
        });

        return this.toResponseDto(updatedJourney!);
      },
      'reorderJourney',
      { journeyId: id, newSortOrder: reorderDto.new_sort_order, userId },
    );
  }

  /**
   * Transform Prisma Journey to Response DTO
   * Maps camelCase Prisma fields to snake_case API fields
   */
  private toResponseDto(journey: any): JourneyResponseDto {
    return {
      id: journey.id,
      name: journey.name,
      description: journey.description,
      sort_order: journey.sortOrder,
      color: journey.color,
      created_at: journey.createdAt,
      updated_at: journey.updatedAt,
      created_by: journey.createdBy,
      updated_by: journey.updatedBy,
    };
  }
}
