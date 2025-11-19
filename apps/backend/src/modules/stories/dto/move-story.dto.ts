import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/**
 * DTO for moving a story to a different cell
 * Changes the step_id and/or release_id to move the story
 */
export class MoveStoryDto {
  @ApiProperty({
    description: 'New step ID (column)',
    example: 'step-uuid-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  step_id?: string;

  @ApiProperty({
    description: 'New release ID (row)',
    example: 'release-uuid-456',
    required: false,
  })
  @IsOptional()
  @IsString()
  release_id?: string;
}
