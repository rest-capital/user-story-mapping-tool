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
 * DTO for updating an existing Release
 * All fields are optional (partial update / PATCH semantics)
 * Uses snake_case per API specification
 *
 * NOTE: is_unassigned cannot be updated (business rule enforced in service)
 */
export class UpdateReleaseDto {
  @ApiProperty({
    description: 'Release name',
    example: 'Updated Sprint 1',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Release description',
    example: 'Updated description',
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
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  shipped?: boolean;

  @ApiProperty({
    description: 'Sort order for reordering (0-based index)',
    example: 2,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
