import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for Journey response
 * What the API returns to the client
 */
export class JourneyResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Story map ID (workspace scoping)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  story_map_id!: string;

  @ApiProperty({
    description: 'Journey name',
    example: 'Messaging',
  })
  name!: string;

  @ApiProperty({
    description: 'Journey description',
    example: 'User messaging and communication features',
  })
  description!: string;

  @ApiProperty({
    description: 'Sort order (0-based index)',
    example: 0,
  })
  sort_order!: number;

  @ApiProperty({
    description: 'Hex color code',
    example: '#8B5CF6',
  })
  color!: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-11-19T00:00:00.000Z',
  })
  created_at!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-11-19T00:00:00.000Z',
  })
  updated_at!: Date;

  @ApiProperty({
    description: 'User ID who created this journey',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  created_by!: string;

  @ApiProperty({
    description: 'User ID who last updated this journey',
    example: '550e8400-e29b-41d4-a716-446655440001',
    nullable: true,
  })
  updated_by!: string | null;
}
