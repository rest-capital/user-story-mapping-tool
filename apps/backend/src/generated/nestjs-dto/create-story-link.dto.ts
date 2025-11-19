
import {StoryLinkType} from '@prisma/client'
import {ApiProperty} from '@nestjs/swagger'
import {IsEnum,IsNotEmpty} from 'class-validator'




export class CreateStoryLinkDto {
  @ApiProperty({
  enum: StoryLinkType,
  enumName: 'StoryLinkType',
})
@IsNotEmpty()
@IsEnum(StoryLinkType)
linkType: StoryLinkType ;
}
