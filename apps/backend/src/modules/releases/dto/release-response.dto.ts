import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for Release response
 * What the API returns to the client (snake_case per API spec)
 */
export class ReleaseResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Release name',
    example: 'Sprint 1',
  })
  name!: string;

  @ApiProperty({
    description: 'Release description',
    example: 'First sprint of the project',
  })
  description!: string;

  @ApiProperty({
    description: 'Release start date',
    example: '2025-11-19T00:00:00.000Z',
    nullable: true,
  })
  start_date!: Date | null;

  @ApiProperty({
    description: 'Release due date',
    example: '2025-12-19T00:00:00.000Z',
    nullable: true,
  })
  due_date!: Date | null;

  @ApiProperty({
    description: 'Whether the release has been shipped',
    example: false,
  })
  shipped!: boolean;

  @ApiProperty({
    description:
      'Whether this is the Unassigned release (special release that cannot be deleted)',
    example: false,
  })
  is_unassigned!: boolean;

  @ApiProperty({
    description:
      'Sort order (0-based index for normal releases, 999999 for Unassigned)',
    example: 0,
  })
  sort_order!: number;

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
    description: 'User ID who created this release',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  created_by!: string;

  @ApiProperty({
    description: 'User ID who last updated this release',
    example: '550e8400-e29b-41d4-a716-446655440001',
    nullable: true,
  })
  updated_by!: string | null;
}
