import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsHexColor, MaxLength } from 'class-validator';

/**
 * DTO for creating a new Journey
 * API layer - what the client sends
 */
export class CreateJourneyDto {
  @ApiProperty({
    description: 'Story map ID (workspace scoping)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  story_map_id!: string;

  @ApiProperty({
    description: 'Journey name (e.g., "1. Messaging")',
    example: 'Messaging',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Optional journey description',
    example: 'User messaging and communication features',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Hex color code for visual grouping',
    example: '#8B5CF6',
    default: '#8B5CF6',
    required: false,
  })
  @IsOptional()
  @IsHexColor()
  color?: string;
}
