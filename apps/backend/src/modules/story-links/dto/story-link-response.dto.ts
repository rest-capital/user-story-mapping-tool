import { ApiProperty } from '@nestjs/swagger';

export class StoryLinkResponseDto {
  @ApiProperty({ description: 'Link ID' })
  id!: string;

  @ApiProperty({ description: 'Source story ID' })
  source_story_id!: string;

  @ApiProperty({ description: 'Target story ID' })
  target_story_id!: string;

  @ApiProperty({
    description: 'Type of link',
    enum: ['LINKED_TO', 'BLOCKS', 'IS_BLOCKED_BY', 'DUPLICATES', 'IS_DUPLICATED_BY'],
  })
  link_type!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at!: Date;

  @ApiProperty({ description: 'Target story details (optional)', required: false })
  target_story?: {
    id: string;
    title: string;
    status: string;
  };
}
