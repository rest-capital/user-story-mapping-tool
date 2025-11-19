import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsHexColor,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

/**
 * DTO for updating an existing Journey
 * All fields are optional (partial update / PATCH semantics)
 */
export class UpdateJourneyDto {
  @ApiProperty({
    description: 'Journey name',
    example: 'Updated Messaging',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Journey description',
    example: 'Updated description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Hex color code',
    example: '#10B981',
    required: false,
  })
  @IsOptional()
  @IsHexColor()
  color?: string;

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
