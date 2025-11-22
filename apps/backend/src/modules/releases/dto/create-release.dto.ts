import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

/**
 * DTO for creating a new Release
 * Uses snake_case per API specification
 */
export class CreateReleaseDto {
  @ApiProperty({
    description: 'Story map ID (workspace scoping)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  story_map_id!: string;

  @ApiProperty({
    description: 'Release name',
    example: 'Sprint 1',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Release description',
    example: 'First sprint of the project',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Release start date (ISO 8601 format)',
    example: '2025-11-19T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({
    description: 'Release due date (ISO 8601 format)',
    example: '2025-12-19T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiProperty({
    description: 'Whether the release has been shipped',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  shipped?: boolean;

  @ApiProperty({
    description: 'Sort order for reordering (0-based index)',
    example: 0,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
