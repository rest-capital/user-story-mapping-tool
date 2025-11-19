
import {ApiExtraModels,ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty,IsString,ValidateNested} from 'class-validator'
import {Type} from 'class-transformer'

export class StoryTagStoryIdTagIdUniqueInputDto {
    @ApiProperty({
  type: 'string',
})
@IsNotEmpty()
@IsString()
storyId: string ;
@ApiProperty({
  type: 'string',
})
@IsNotEmpty()
@IsString()
tagId: string ;
  }

@ApiExtraModels(StoryTagStoryIdTagIdUniqueInputDto)
export class ConnectStoryTagDto {
  @ApiProperty({
  type: StoryTagStoryIdTagIdUniqueInputDto,
})
@IsNotEmpty()
@ValidateNested()
@Type(() => StoryTagStoryIdTagIdUniqueInputDto)
storyId_tagId: StoryTagStoryIdTagIdUniqueInputDto ;
}
