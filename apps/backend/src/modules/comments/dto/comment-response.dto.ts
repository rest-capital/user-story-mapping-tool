import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for comment responses
 * Uses snake_case per API specification
 */
export class CommentResponseDto {
  @ApiProperty({ description: 'Comment ID' })
  id!: string;

  @ApiProperty({ description: 'Story ID (if comment is on a story)', nullable: true })
  story_id!: string | null;

  @ApiProperty({ description: 'Release ID (if comment is on a release)', nullable: true })
  release_id!: string | null;

  @ApiProperty({ description: 'Author user ID' })
  author_id!: string;

  @ApiProperty({ description: 'Author name' })
  author!: string;

  @ApiProperty({ description: 'Author avatar URL', nullable: true })
  avatar_url!: string | null;

  @ApiProperty({ description: 'Comment content' })
  content!: string;

  @ApiProperty({ description: 'Created timestamp' })
  created_at!: Date;

  @ApiProperty({ description: 'Last updated timestamp' })
  updated_at!: Date;

  @ApiProperty({ description: 'Whether the comment belongs to the current user' })
  is_current_user!: boolean;
}
