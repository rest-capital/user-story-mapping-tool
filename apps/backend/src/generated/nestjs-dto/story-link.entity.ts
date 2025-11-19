
import {StoryLinkType} from '@prisma/client'
import {ApiProperty} from '@nestjs/swagger'
import {Story} from './story.entity'


export class StoryLink {
  @ApiProperty({
  type: 'string',
})
id: string ;
@ApiProperty({
  type: 'string',
})
sourceStoryId: string ;
@ApiProperty({
  type: 'string',
})
targetStoryId: string ;
@ApiProperty({
  enum: StoryLinkType,
  enumName: 'StoryLinkType',
})
linkType: StoryLinkType ;
@ApiProperty({
  type: 'string',
  format: 'date-time',
})
createdAt: Date ;
@ApiProperty({
  type: () => Story,
  required: false,
})
sourceStory?: Story ;
@ApiProperty({
  type: () => Story,
  required: false,
})
targetStory?: Story ;
}
