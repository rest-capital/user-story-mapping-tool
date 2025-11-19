import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for creating a comment
 * Frontend sends ONLY content - auth info extracted from JWT by backend
 */
export class CreateCommentDto {
  @ApiProperty({
    description: 'Comment content',
    example: 'This story needs clarification on the acceptance criteria',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
