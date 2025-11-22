import { ApiProperty } from '@nestjs/swagger';

export class PersonaResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Story map ID (workspace scoping)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  story_map_id!: string;

  @ApiProperty({
    description: 'Persona name',
    example: 'Admin User',
  })
  name!: string;

  @ApiProperty({
    description: 'Persona description',
    example: 'System administrator with full access',
  })
  description!: string;

  @ApiProperty({
    description: 'Avatar image URL (nullable)',
    example: 'https://example.com/avatars/admin.png',
    nullable: true,
  })
  avatar_url!: string | null;

  @ApiProperty({
    description: 'Timestamp of creation',
    example: '2025-11-18T10:30:00Z',
  })
  created_at!: Date;
}
