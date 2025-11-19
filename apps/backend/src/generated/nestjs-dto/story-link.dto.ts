
import {StoryLinkType} from '@prisma/client'
import {ApiProperty} from '@nestjs/swagger'


export class StoryLinkDto {
  @ApiProperty({
  type: 'string',
})
id: string ;
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
}
