
import {ApiExtraModels,ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty,IsString,ValidateNested} from 'class-validator'
import {Type} from 'class-transformer'

export class StoryPersonaStoryIdPersonaIdUniqueInputDto {
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
personaId: string ;
  }

@ApiExtraModels(StoryPersonaStoryIdPersonaIdUniqueInputDto)
export class ConnectStoryPersonaDto {
  @ApiProperty({
  type: StoryPersonaStoryIdPersonaIdUniqueInputDto,
})
@IsNotEmpty()
@ValidateNested()
@Type(() => StoryPersonaStoryIdPersonaIdUniqueInputDto)
storyId_personaId: StoryPersonaStoryIdPersonaIdUniqueInputDto ;
}
