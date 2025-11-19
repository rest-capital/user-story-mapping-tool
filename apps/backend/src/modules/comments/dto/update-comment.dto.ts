import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for updating a comment
 * Frontend sends ONLY content - author validation done by backend
 */
export class UpdateCommentDto {
  @ApiProperty({
    description: 'Updated comment content',
    example: 'Updated: This story needs clarification on the acceptance criteria',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
