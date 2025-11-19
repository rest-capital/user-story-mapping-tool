import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { User } from '@supabase/supabase-js';
import { StepsService } from './steps.service';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { StepResponseDto } from './dto/step-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

/**
 * Step Controller
 * Handles HTTP requests for Step CRUD operations
 *
 * All routes require authentication (SupabaseAuthGuard)
 */
@ApiTags('steps')
@Controller('steps')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class StepsController {
  constructor(private readonly stepsService: StepsService) {}

  /**
   * Create a new step
   * POST /steps
   */
  @Post()
  @ApiOperation({ summary: 'Create a new step under a journey' })
  @ApiResponse({
    status: 201,
    description: 'Step created successfully',
    type: StepResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Journey not found',
  })
  async create(
    @Body() createStepDto: CreateStepDto,
    @GetUser() user: User,
  ): Promise<StepResponseDto> {
    return this.stepsService.create(createStepDto, user.id);
  }

  /**
   * Get all steps
   * GET /steps
   */
  @Get()
  @ApiOperation({ summary: 'Get all steps sorted by journey and sort order' })
  @ApiResponse({
    status: 200,
    description: 'List of all steps',
    type: [StepResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async findAll(): Promise<StepResponseDto[]> {
    return this.stepsService.findAll();
  }

  /**
   * Get a single step by ID
   * GET /steps/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a step by ID' })
  @ApiResponse({
    status: 200,
    description: 'Step found',
    type: StepResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Step not found',
  })
  async findOne(@Param('id') id: string): Promise<StepResponseDto> {
    return this.stepsService.findOne(id);
  }

  /**
   * Update a step
   * PATCH /steps/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a step (partial update)' })
  @ApiResponse({
    status: 200,
    description: 'Step updated successfully',
    type: StepResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Step not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateStepDto: UpdateStepDto,
    @GetUser() user: User,
  ): Promise<StepResponseDto> {
    return this.stepsService.update(id, updateStepDto, user.id);
  }

  /**
   * Delete a step
   * DELETE /steps/:id
   *
   * CRITICAL: Cascades to stories in this step
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a step (cascades to stories)',
  })
  @ApiResponse({
    status: 200,
    description: 'Step deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Step not found',
  })
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.stepsService.remove(id);
  }
}

/**
 * Nested route controller for Journey → Steps
 * Handles /journeys/:journeyId/steps
 */
@ApiTags('steps')
@Controller('journeys/:journeyId/steps')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class JourneyStepsController {
  constructor(private readonly stepsService: StepsService) {}

  /**
   * Get all steps for a specific journey
   * GET /journeys/:journeyId/steps
   */
  @Get()
  @ApiOperation({ summary: 'Get all steps for a specific journey' })
  @ApiResponse({
    status: 200,
    description: 'List of steps for the journey',
    type: [StepResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Journey not found',
  })
  async findByJourneyId(
    @Param('journeyId') journeyId: string,
  ): Promise<StepResponseDto[]> {
    return this.stepsService.findByJourneyId(journeyId);
  }
}
