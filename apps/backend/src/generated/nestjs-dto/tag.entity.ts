
import {ApiProperty} from '@nestjs/swagger'
import {StoryMap} from './story-map.entity'
import {StoryTag} from './story-tag.entity'


export class Tag {
  @ApiProperty({
  type: 'string',
})
id: string ;
@ApiProperty({
  type: 'string',
})
storyMapId: string ;
@ApiProperty({
  type: 'string',
})
name: string ;
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
  type: 'string',
})
createdBy: string ;
@ApiProperty({
  type: 'string',
  nullable: true,
})
updatedBy: string  | null;
@ApiProperty({
  type: () => StoryMap,
  required: false,
})
storyMap?: StoryMap ;
@ApiProperty({
  type: () => StoryTag,
  isArray: true,
  required: false,
})
stories?: StoryTag[] ;
}
