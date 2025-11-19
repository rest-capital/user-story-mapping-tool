import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PersonasService } from './personas.service';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { PersonaResponseDto } from './dto/persona-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';

@ApiTags('personas')
@Controller('personas')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  /**
   * Get all personas
   */
  @Get()
  @ApiOperation({ summary: 'Get all personas' })
  @ApiResponse({
    status: 200,
    description: 'List of all personas ordered by name',
    type: [PersonaResponseDto],
  })
  async findAll(): Promise<PersonaResponseDto[]> {
    return this.personasService.findAll();
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
  ): Promise<PersonaResponseDto> {
    return this.personasService.create(createPersonaDto);
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
  ): Promise<PersonaResponseDto> {
    return this.personasService.update(id, updatePersonaDto);
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
    description: 'Persona not found',
  })
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.personasService.remove(id);
  }
}
