import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PersonasService } from './personas.service';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { PersonaResponseDto } from './dto/persona-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '@supabase/supabase-js';

@ApiTags('personas')
@Controller('personas')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  /**
   * Get all personas for a story map
   */
  @Get()
  @ApiOperation({ summary: 'Get all personas for a story map (workspace-scoped)' })
  @ApiResponse({
    status: 200,
    description: 'List of all personas ordered by name',
    type: [PersonaResponseDto],
  })
  async findAll(@Query('story_map_id') storyMapId: string): Promise<PersonaResponseDto[]> {
    return this.personasService.findAll(storyMapId);
  }

  /**
   * Get a single persona by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single persona by ID' })
  @ApiParam({
    name: 'id',
    description: 'Persona UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Persona details',
    type: PersonaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Persona not found',
  })
  async findOne(@Param('id') id: string): Promise<PersonaResponseDto> {
    return this.personasService.findOne(id);
  }

  /**
   * Create a new persona
   */
  @Post()
  @ApiOperation({ summary: 'Create a new persona' })
  @ApiResponse({
    status: 201,
    description: 'Persona created successfully',
    type: PersonaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async create(
    @Body() createPersonaDto: CreatePersonaDto,
    @GetUser() user: User,
  ): Promise<PersonaResponseDto> {
    return this.personasService.create(createPersonaDto, user.id);
  }

  /**
   * Update an existing persona
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing persona' })
  @ApiParam({
    name: 'id',
    description: 'Persona UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Persona updated successfully',
    type: PersonaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Persona not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updatePersonaDto: UpdatePersonaDto,
    @GetUser() user: User,
  ): Promise<PersonaResponseDto> {
    return this.personasService.update(id, updatePersonaDto, user.id);
  }

  /**
   * Delete a persona
   * Removes persona from all stories automatically
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a persona',
    description: 'Removes persona from all stories (cascade delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'Persona UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'story_map_id',
    description: 'Story Map ID (workspace context)',
    type: 'string',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Persona deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Persona not found or not in specified workspace',
  })
  async remove(
    @Param('id') id: string,
    @Query('story_map_id') storyMapId: string,
  ): Promise<{ success: boolean }> {
    return this.personasService.remove(id, storyMapId);
  }
}
