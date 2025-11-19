
import {ApiProperty} from '@nestjs/swagger'
import {Story} from './story.entity'
import {Release} from './release.entity'


export class Comment {
  @ApiProperty({
  type: 'string',
})
id: string ;
@ApiProperty({
  type: 'string',
  nullable: true,
})
storyId: string  | null;
@ApiProperty({
  type: 'string',
  nullable: true,
})
releaseId: string  | null;
@ApiProperty({
  type: 'string',
})
authorId: string ;
@ApiProperty({
  type: 'string',
})
author: string ;
@ApiProperty({
  type: 'string',
  nullable: true,
})
avatarUrl: string  | null;
@ApiProperty({
  type: 'string',
})
content: string ;
@ApiProperty({
  type: 'string',
  format: 'date-time',
})
createdAt: Date ;
@ApiProperty({
  type: 'string',
  format: 'date-time',
})
updatedAt: Date ;
@ApiProperty({
  type: () => Story,
  required: false,
  nullable: true,
})
story?: Story  | null;
@ApiProperty({
  type: () => Release,
  required: false,
  nullable: true,
})
release?: Release  | null;
}
