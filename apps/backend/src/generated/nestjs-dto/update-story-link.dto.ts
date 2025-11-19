
import {StoryLinkType} from '@prisma/client'
import {ApiProperty} from '@nestjs/swagger'
import {IsEnum,IsOptional} from 'class-validator'




export class UpdateStoryLinkDto {
  @ApiProperty({
  enum: StoryLinkType,
  enumName: 'StoryLinkType',
  required: false,
})
@IsOptional()
@IsEnum(StoryLinkType)
linkType?: StoryLinkType ;
}
