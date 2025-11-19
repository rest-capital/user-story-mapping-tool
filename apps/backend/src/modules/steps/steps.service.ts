import { Injectable } from '@nestjs/common';
import { BaseService } from '../../common/base.service';
import { PrismaService } from '../prisma/prisma.service';
import { StepError } from './errors/step.error';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
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
