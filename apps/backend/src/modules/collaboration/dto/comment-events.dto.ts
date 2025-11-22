import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentEventDto {
  @ApiProperty({ description: 'Story map ID' })
  @IsUUID()
  mapId!: string;

  @ApiProperty({ description: 'Story ID to comment on' })
  @IsUUID()
  storyId!: string;

  @ApiProperty({ description: 'Comment content' })
  @IsString()
  content!: string;
}

export class DeleteCommentEventDto {
  @ApiProperty({ description: 'Comment ID' })
  @IsUUID()
  id!: string;

  @ApiProperty({ description: 'Story map ID' })
  @IsUUID()
  mapId!: string;

  @ApiProperty({ description: 'Story ID' })
  @IsUUID()
  storyId!: string;
}
