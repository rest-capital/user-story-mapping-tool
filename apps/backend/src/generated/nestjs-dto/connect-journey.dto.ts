
import {ApiExtraModels,ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty,IsOptional,IsString,ValidateNested} from 'class-validator'
import {Type} from 'class-transformer'

export class JourneyStoryMapIdNameUniqueInputDto {
    @ApiProperty({
  type: 'string',
})
@IsNotEmpty()
@IsString()
storyMapId: string ;
@ApiProperty({
  type: 'string',
})
@IsNotEmpty()
@IsString()
name: string ;
  }

@ApiExtraModels(JourneyStoryMapIdNameUniqueInputDto)
export class ConnectJourneyDto {
  @ApiProperty({
  type: 'string',
  required: false,
})
@IsOptional()
@IsString()
id?: string ;
@ApiProperty({
  type: JourneyStoryMapIdNameUniqueInputDto,
  required: false,
})
@IsOptional()
@ValidateNested()
@Type(() => JourneyStoryMapIdNameUniqueInputDto)
storyMapId_name?: JourneyStoryMapIdNameUniqueInputDto ;
}
