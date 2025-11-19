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
import { JourneysService } from './journeys.service';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { UpdateJourneyDto } from './dto/update-journey.dto';
import { ReorderJourneyDto } from './dto/reorder-journey.dto';
import { JourneyResponseDto } from './dto/journey-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

/**
 * Journey Controller
 * Handles HTTP requests for Journey CRUD operations
 *
 * All routes require authentication (SupabaseAuthGuard)
 */
@ApiTags('journeys')
@Controller('journeys')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class JourneysController {
  constructor(private readonly journeysService: JourneysService) {}

  /**
   * Create a new journey
   * POST /journeys
   */
  @Post()
  @ApiOperation({ summary: 'Create a new journey' })
  @ApiResponse({
    status: 201,
    description: 'Journey created successfully',
    type: JourneyResponseDto,
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
    status: 409,
    description: 'Journey with this name already exists',
  })
  async create(
    @Body() createJourneyDto: CreateJourneyDto,
    @GetUser() user: User,
  ): Promise<JourneyResponseDto> {
    return this.journeysService.create(createJourneyDto, user.id);
  }

  /**
   * Get all journeys
   * GET /journeys
   */
  @Get()
  @ApiOperation({ summary: 'Get all journeys sorted by sort order' })
  @ApiResponse({
    status: 200,
    description: 'List of all journeys',
    type: [JourneyResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async findAll(): Promise<JourneyResponseDto[]> {
    return this.journeysService.findAll();
  }

  /**
   * Get a single journey by ID
   * GET /journeys/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a journey by ID' })
  @ApiResponse({
    status: 200,
    description: 'Journey found',
    type: JourneyResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Journey not found',
  })
  async findOne(@Param('id') id: string): Promise<JourneyResponseDto> {
    return this.journeysService.findOne(id);
  }

  /**
   * Update a journey
   * PATCH /journeys/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a journey (partial update)' })
  @ApiResponse({
    status: 200,
    description: 'Journey updated successfully',
    type: JourneyResponseDto,
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
  @ApiResponse({
    status: 409,
    description: 'Journey with this name already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updateJourneyDto: UpdateJourneyDto,
    @GetUser() user: User,
  ): Promise<JourneyResponseDto> {
    return this.journeysService.update(id, updateJourneyDto, user.id);
  }

  /**
   * Delete a journey
   * DELETE /journeys/:id
   *
   * CRITICAL: Cascades to steps and stories
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a journey (cascades to steps and stories)',
  })
  @ApiResponse({
    status: 200,
    description: 'Journey deleted successfully',
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
    description: 'Journey not found',
  })
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.journeysService.remove(id);
  }

  /**
   * Reorder a journey
   * POST /journeys/:id/reorder
   *
   * Updates the sort_order to change position in the list
   */
  @Post(':id/reorder')
  @ApiOperation({ summary: 'Reorder a journey by updating its sort order' })
  @ApiResponse({
    status: 200,
    description: 'Journey reordered successfully',
    type: JourneyResponseDto,
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
  async reorder(
    @Param('id') id: string,
    @Body() reorderDto: ReorderJourneyDto,
    @GetUser() user: User,
  ): Promise<JourneyResponseDto> {
    return this.journeysService.reorder(id, reorderDto, user.id);
  }
}
