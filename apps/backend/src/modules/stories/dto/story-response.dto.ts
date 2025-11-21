import { ApiProperty } from '@nestjs/swagger';
import { StoryStatus } from './create-story.dto';
import { StoryLinkResponseDto } from '../../story-links/dto/story-link-response.dto';

export class StoryResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Foreign key to Step',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  step_id!: string;

  @ApiProperty({
    description: 'Foreign key to Release',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  release_id!: string;

  @ApiProperty({
    description: 'Story title',
    example: 'View all chats',
  })
  title!: string;

  @ApiProperty({
    description: 'Rich text description',
    example: 'As a user, I want to view all my chats...',
  })
  description!: string;

  @ApiProperty({
    description: 'Story status',
    enum: StoryStatus,
    example: StoryStatus.NOT_READY,
  })
  status!: StoryStatus;

  @ApiProperty({
    description: 'Story points (nullable)',
    example: 3,
    nullable: true,
  })
  size!: number | null;

  @ApiProperty({
    description: 'Label ID (nullable)',
    example: 'default-label',
    nullable: true,
  })
  label_id!: string | null;

  @ApiProperty({
    description: 'Label name',
    example: 'Story',
  })
  label_name!: string;

  @ApiProperty({
    description: 'Label color (hex code)',
    example: '#3B82F6',
  })
  label_color!: string;

  @ApiProperty({
    description: 'Position within cell (1000-based)',
    example: 1000,
  })
  sort_order!: number;

  @ApiProperty({
    description: 'Timestamp of creation',
    example: '2025-11-18T10:30:00Z',
  })
  created_at!: Date;

  @ApiProperty({
    description: 'Timestamp of last update',
    example: '2025-11-18T10:30:00Z',
  })
  updated_at!: Date;

  @ApiProperty({
    description: 'User ID who created the story',
    example: 'user-123',
  })
  created_by!: string;

  @ApiProperty({
    description: 'User ID who last updated the story (nullable)',
    example: 'user-456',
    nullable: true,
  })
  updated_by!: string | null;

  @ApiProperty({
    description: 'Story dependencies (optional, only included when requested)',
    type: [StoryLinkResponseDto],
    required: false,
  })
  dependencies?: StoryLinkResponseDto[];
}
