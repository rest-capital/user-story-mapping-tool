
import {ApiProperty} from '@nestjs/swagger'
import {Story} from './story.entity'
import {Tag} from './tag.entity'


export class StoryTag {
  @ApiProperty({
  type: 'string',
})
storyId: string ;
@ApiProperty({
  type: 'string',
})
tagId: string ;
@ApiProperty({
  type: () => Story,
  required: false,
})
story?: Story ;
@ApiProperty({
  type: () => Tag,
  required: false,
})
tag?: Tag ;
}
