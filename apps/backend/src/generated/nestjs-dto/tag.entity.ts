
import {ApiProperty} from '@nestjs/swagger'
import {StoryTag} from './story-tag.entity'


export class Tag {
  @ApiProperty({
  type: 'string',
})
id: string ;
@ApiProperty({
  type: 'string',
})
name: string ;
@ApiProperty({
  type: 'string',
})
color: string ;
@ApiProperty({
  type: 'string',
  format: 'date-time',
})
createdAt: Date ;
@ApiProperty({
  type: () => StoryTag,
  isArray: true,
  required: false,
})
stories?: StoryTag[] ;
}
