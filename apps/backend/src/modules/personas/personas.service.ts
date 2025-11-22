import { Injectable } from '@nestjs/common';
import { BaseService } from '../../common/base.service';
import { PrismaService } from '../prisma/prisma.service';
import { PersonaError } from './errors/persona.error';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { PersonaResponseDto } from './dto/persona-response.dto';

@Injectable()
export class PersonasService extends BaseService {
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
    return new PersonaError(message, cause, context);
  }

  /**
   * Get all personas
   * Workspace-scoped: filtered by story_map_id
   */
  async findAll(storyMapId: string): Promise<PersonaResponseDto[]> {
    this.validateRequired(storyMapId, 'storyMapId');

    return this.executeOperation(
      async () => {
        const personas = await this.prisma.persona.findMany({
          where: { storyMapId },
          orderBy: { name: 'asc' },
        });

        return personas.map((persona) => this.toResponseDto(persona));
      },
      'findAllPersonas',
      { storyMapId },
    );
  }

  /**
   * Get a single persona by ID
   */
  async findOne(id: string): Promise<PersonaResponseDto> {
    this.validateRequired(id, 'id', 'Persona');

    return this.executeOperation(
      async () => {
        const persona = await this.prisma.persona.findUnique({
          where: { id },
        });

        if (!persona) {
          throw new PersonaError('Persona not found');
        }

        return this.toResponseDto(persona);
      },
      'findOnePersona',
      { personaId: id },
    );
  }

  /**
   * Create a new persona
   * Workspace-scoped: validates story_map_id and user access
   */
  async create(createDto: CreatePersonaDto, userId: string): Promise<PersonaResponseDto> {
    this.validateRequired(createDto.name, 'name');
    this.validateRequired(createDto.story_map_id, 'story_map_id', 'Persona');
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
          throw new PersonaError('Story map not found or access denied');
        }

        const persona = await this.prisma.persona.create({
          data: {
            storyMapId: createDto.story_map_id,
            name: createDto.name,
            description: createDto.description || '',
            avatarUrl: createDto.avatar_url || null,
            createdBy: userId,
          },
        });

        return this.toResponseDto(persona);
      },
      'createPersona',
      { name: createDto.name, storyMapId: createDto.story_map_id, userId },
    );
  }

  /**
   * Update an existing persona
   */
  async update(
    id: string,
    updateDto: UpdatePersonaDto,
    userId: string,
  ): Promise<PersonaResponseDto> {
    this.validateRequired(id, 'id', 'Persona');
    this.validateRequired(userId, 'userId');

    return this.executeOperation(
      async () => {
        const persona = await this.prisma.persona.findUnique({
          where: { id },
        });

        if (!persona) {
          throw new PersonaError('Persona not found');
        }

        // CRITICAL: Conditional assignment to prevent undefined overwrites
        // Transform snake_case DTO → camelCase Prisma
        const updateData: any = { updatedBy: userId };

        if (updateDto.name !== undefined) updateData.name = updateDto.name;
        if (updateDto.description !== undefined)
          updateData.description = updateDto.description;
        if (updateDto.avatar_url !== undefined)
          updateData.avatarUrl = updateDto.avatar_url;

        const updatedPersona = await this.prisma.persona.update({
          where: { id },
          data: updateData,
        });

        return this.toResponseDto(updatedPersona);
      },
      'updatePersona',
      { personaId: id, userId },
    );
  }

  /**
   * Delete a persona
   * Cascade delete removes from all stories automatically
   */
  async remove(id: string, storyMapId: string): Promise<{ success: boolean }> {
    this.validateRequired(id, 'id', 'Persona');
    this.validateRequired(storyMapId, 'storyMapId', 'Persona');

    return this.executeOperation(
      async () => {
        const persona = await this.prisma.persona.findUnique({
          where: { id },
        });

        if (!persona) {
          throw new PersonaError('Persona not found');
        }

        // CRITICAL: Validate workspace ownership
        if (persona.storyMapId !== storyMapId) {
          throw new PersonaError('Persona not found');
        }

        // Database cascade will remove from StoryPersona junction table
        await this.prisma.persona.delete({
          where: { id },
        });

        return { success: true };
      },
      'deletePersona',
      { personaId: id, storyMapId },
    );
  }

  /**
   * Transform Prisma Persona to Response DTO
   * Maps camelCase Prisma fields to snake_case API fields
   */
  private toResponseDto(persona: any): PersonaResponseDto {
    return {
      id: persona.id,
      story_map_id: persona.storyMapId,
      name: persona.name,
      description: persona.description,
      avatar_url: persona.avatarUrl,
      created_at: persona.createdAt,
    };
  }
}
