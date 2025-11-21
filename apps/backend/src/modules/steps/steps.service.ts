import { Injectable } from '@nestjs/common';
import { BaseService } from '../../common/base.service';
import { PrismaService } from '../prisma/prisma.service';
import { StepError } from './errors/step.error';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { ReorderStepDto } from './dto/reorder-step.dto';
import { StepResponseDto } from './dto/step-response.dto';

/**
 * Service for Step business logic
 * Extends BaseService for automatic error handling, logging, and transactions
 */
@Injectable()
export class StepsService extends BaseService {
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
    return new StepError(message, cause, context);
  }

  /**
   * Create a new step under a journey
   * Auto-generates sort_order (0-based within journey)
   */
  async create(
    createDto: CreateStepDto,
    userId: string,
  ): Promise<StepResponseDto> {
    this.validateRequired(createDto.journey_id, 'journey_id', 'Step');
    this.validateRequired(createDto.name, 'name', 'Step');
    this.validateRequired(userId, 'userId');

    return this.executeOperation(
      async () => {
        // Business rule: Validate journey exists
        const journey = await this.prisma.journey.findUnique({
          where: { id: createDto.journey_id },
        });

        if (!journey) {
          throw new StepError('Journey not found');
        }

        // Business rule: Calculate next sort_order (0-based within journey)
        const existingCount = await this.prisma.step.count({
          where: { journeyId: createDto.journey_id },
        });
        const sortOrder = existingCount; // 0, 1, 2, 3...

        // Create step with defaults
        const step = await this.prisma.step.create({
          data: {
            journeyId: createDto.journey_id,
            name: createDto.name,
            description: createDto.description || '',
            sortOrder,
            createdBy: userId,
          },
        });

        return this.toResponseDto(step);
      },
      'createStep',
      { journeyId: createDto.journey_id, name: createDto.name, userId },
    );
  }

  /**
   * Get all steps sorted by journey and sort_order
   */
  async findAll(): Promise<StepResponseDto[]> {
    return this.executeOperation(
      async () => {
        const steps = await this.prisma.step.findMany({
          orderBy: [{ journeyId: 'asc' }, { sortOrder: 'asc' }],
        });

        return steps.map((step) => this.toResponseDto(step));
      },
      'findAllSteps',
    );
  }

  /**
   * Get all steps for a specific journey
   */
  async findByJourneyId(journeyId: string): Promise<StepResponseDto[]> {
    this.validateRequired(journeyId, 'journeyId');

    return this.executeOperation(
      async () => {
        // Validate journey exists
        const journey = await this.prisma.journey.findUnique({
          where: { id: journeyId },
        });

        if (!journey) {
          throw new StepError('Journey not found');
        }

        const steps = await this.prisma.step.findMany({
          where: { journeyId },
          orderBy: { sortOrder: 'asc' },
        });

        return steps.map((step) => this.toResponseDto(step));
      },
      'findStepsByJourneyId',
      { journeyId },
    );
  }

  /**
   * Get a single step by ID
   */
  async findOne(id: string): Promise<StepResponseDto> {
    this.validateRequired(id, 'id', 'Step');

    return this.executeOperation(
      async () => {
        const step = await this.prisma.step.findUnique({
          where: { id },
        });

        if (!step) {
          throw new StepError('Step not found');
        }

        return this.toResponseDto(step);
      },
      'findStepById',
      { stepId: id },
    );
  }

  /**
   * Update a step
   * Supports partial updates (PATCH semantics)
   */
  async update(
    id: string,
    updateDto: UpdateStepDto,
    userId: string,
  ): Promise<StepResponseDto> {
    this.validateRequired(id, 'id', 'Step');
    this.validateRequired(userId, 'userId');

    return this.executeOperation(
      async () => {
        // Verify step exists
        const existing = await this.prisma.step.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new StepError('Step not found');
        }

        // Update step - map snake_case DTO to camelCase Prisma
        const updateData: any = { updatedBy: userId };
        if (updateDto.name !== undefined) updateData.name = updateDto.name;
        if (updateDto.description !== undefined)
          updateData.description = updateDto.description;
        if (updateDto.sort_order !== undefined)
          updateData.sortOrder = updateDto.sort_order;

        const step = await this.prisma.step.update({
          where: { id },
          data: updateData,
        });

        return this.toResponseDto(step);
      },
      'updateStep',
      { stepId: id, updates: Object.keys(updateDto), userId },
    );
  }

  /**
   * Delete a step
   * CRITICAL: Cascades to stories in this step (via Prisma schema)
   */
  async remove(id: string): Promise<{ success: boolean }> {
    this.validateRequired(id, 'id', 'Step');

    return this.executeOperation(
      async () => {
        // Verify step exists
        const existing = await this.prisma.step.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new StepError('Step not found');
        }

        // Delete step (cascades to stories via Prisma schema)
        await this.prisma.step.delete({
          where: { id },
        });

        return { success: true };
      },
      'deleteStep',
      { stepId: id },
    );
  }

  /**
   * Reorder a step
   * Properly rearranges all steps within a journey to maintain sequential 0-based sort_order
   */
  async reorder(
    id: string,
    reorderDto: ReorderStepDto,
    userId: string,
  ): Promise<StepResponseDto> {
    this.validateRequired(id, 'id', 'Step');
    this.validateRequired(userId, 'userId');
    this.validateRange(
      reorderDto.new_sort_order,
      0,
      Number.MAX_SAFE_INTEGER,
      'new_sort_order',
    );

    return this.executeInTransaction(
      async (tx) => {
        // Get the target step to find its journey
        const targetStep = await tx.step.findUnique({
          where: { id },
        });

        if (!targetStep) {
          throw new StepError('Step not found');
        }

        // Fetch all steps in the same journey sorted by current sort_order
        const allSteps = await tx.step.findMany({
          where: { journeyId: targetStep.journeyId },
          orderBy: { sortOrder: 'asc' },
        });

        // Find the target step index
        const targetIndex = allSteps.findIndex((s: any) => s.id === id);
        if (targetIndex === -1) {
          throw new StepError('Step not found');
        }

        // Validate new position is within bounds
        if (reorderDto.new_sort_order >= allSteps.length) {
          throw new StepError(
            `new_sort_order must be less than ${allSteps.length}`,
          );
        }

        // Remove target step from current position
        const [movedStep] = allSteps.splice(targetIndex, 1);

        // Insert at new position
        allSteps.splice(reorderDto.new_sort_order, 0, movedStep);

        // Update all steps with new sequential sort_orders
        await Promise.all(
          allSteps.map((step: any, index: number) =>
            tx.step.update({
              where: { id: step.id },
              data: {
                sortOrder: index,
                updatedBy: userId,
              },
            }),
          ),
        );

        // Return the updated target step
        const updatedStep = await tx.step.findUnique({
          where: { id },
        });

        return this.toResponseDto(updatedStep!);
      },
      'reorderStep',
      { stepId: id, newSortOrder: reorderDto.new_sort_order, userId },
    );
  }

  /**
   * Transform Prisma Step to Response DTO
   * Maps camelCase Prisma fields to snake_case API fields
   */
  private toResponseDto(step: any): StepResponseDto {
    return {
      id: step.id,
      journey_id: step.journeyId,
      name: step.name,
      description: step.description,
      sort_order: step.sortOrder,
      created_at: step.createdAt,
      updated_at: step.updatedAt,
      created_by: step.createdBy,
      updated_by: step.updatedBy,
    };
  }
}
