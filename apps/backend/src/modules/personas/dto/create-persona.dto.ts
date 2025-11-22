import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreatePersonaDto {
  @ApiProperty({
    description: 'Story map ID (workspace scoping)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  story_map_id!: string;

  @ApiProperty({
    description: 'Persona name (unique within story map)',
    example: 'Admin User',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Persona description',
    required: false,
    default: '',
    example: 'System administrator with full access',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Avatar image URL',
    required: false,
    example: 'https://example.com/avatars/admin.png',
  })
  @IsOptional()
  @IsString()
  avatar_url?: string;
}
