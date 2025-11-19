import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';

export enum StoryStatus {
  NOT_READY = 'NOT_READY',
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  BLOCKED = 'BLOCKED',
}

export class CreateStoryDto {
  @ApiProperty({
    description: 'Foreign key to Step (defines column)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  step_id!: string;

  @ApiProperty({
    description: 'Foreign key to Release (defines row)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString()
  release_id!: string;

  @ApiProperty({
    description: 'Story title (displayed on card)',
    example: 'View all chats',
  })
  @IsString()
  title!: string;

  @ApiProperty({
    description: 'Rich text description',
    required: false,
    default: '',
    example: 'As a user, I want to view all my chats...',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Story status',
    enum: StoryStatus,
    required: false,
    default: StoryStatus.NOT_READY,
  })
  @IsOptional()
  @IsEnum(StoryStatus)
  status?: StoryStatus;

  @ApiProperty({
    description: 'Story points (1, 2, 3, 5, 8, etc.)',
    required: false,
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  size?: number;
}
