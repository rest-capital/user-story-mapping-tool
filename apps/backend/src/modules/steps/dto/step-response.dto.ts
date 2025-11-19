import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for Step API responses
 * Matches the Prisma schema exactly
 */
export class StepResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'ID of the parent journey',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  journey_id!: string;

  @ApiProperty({
    description: 'Name of the step',
    example: 'Send messages',
  })
  name!: string;

  @ApiProperty({
    description: 'Description of the step',
    example: 'User sends messages to contacts',
  })
  description!: string;

  @ApiProperty({
    description: 'Position within the journey (0-based)',
    example: 0,
  })
  sort_order!: number;

  @ApiProperty({
    description: 'Timestamp of creation',
    example: '2024-01-15T10:30:00Z',
  })
  created_at!: Date;

  @ApiProperty({
    description: 'Timestamp of last update',
    example: '2024-01-15T14:22:00Z',
  })
  updated_at!: Date;

  @ApiProperty({
    description: 'ID of user who created the step',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  created_by!: string;

  @ApiProperty({
    description: 'ID of user who last updated the step',
    example: '123e4567-e89b-12d3-a456-426614174002',
    nullable: true,
  })
  updated_by!: string | null;
}
