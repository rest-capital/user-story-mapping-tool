import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';

export enum StoryLinkType {
  LINKED_TO = 'LINKED_TO',
  BLOCKS = 'BLOCKS',
  IS_BLOCKED_BY = 'IS_BLOCKED_BY',
  DUPLICATES = 'DUPLICATES',
  IS_DUPLICATED_BY = 'IS_DUPLICATED_BY',
}

export class CreateStoryLinkDto {
  @ApiProperty({
    description: 'ID of the target story',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  target_story_id!: string;

  @ApiProperty({
    description: 'Type of link/dependency',
    enum: StoryLinkType,
    example: 'BLOCKS',
  })
  @IsEnum(StoryLinkType)
  link_type!: StoryLinkType;
}
