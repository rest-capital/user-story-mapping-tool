import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { StoryStatus } from './create-story.dto';

export class UpdateStoryDto {
  @ApiProperty({
    description: 'Story title',
    required: false,
    example: 'View all chats (updated)',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Rich text description',
    required: false,
    example: 'Updated description...',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Story status',
    enum: StoryStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(StoryStatus)
  status?: StoryStatus;

  @ApiProperty({
    description: 'Story points',
    required: false,
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  size?: number;

  @ApiProperty({
    description: 'Foreign key to Step (for moving to different cell)',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  step_id?: string;

  @ApiProperty({
    description: 'Foreign key to Release (for moving to different cell)',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsString()
  release_id?: string;

  @ApiProperty({
    description: 'Position within cell (for reordering)',
    required: false,
    example: 1500,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
