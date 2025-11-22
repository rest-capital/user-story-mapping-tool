
import {ApiExtraModels,ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty,IsOptional,IsString,ValidateNested} from 'class-validator'
import {Type} from 'class-transformer'

export class TagStoryMapIdNameUniqueInputDto {
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

@ApiExtraModels(TagStoryMapIdNameUniqueInputDto)
export class ConnectTagDto {
  @ApiProperty({
  type: 'string',
  required: false,
})
@IsOptional()
@IsString()
id?: string ;
@ApiProperty({
  type: TagStoryMapIdNameUniqueInputDto,
  required: false,
})
@IsOptional()
@ValidateNested()
@Type(() => TagStoryMapIdNameUniqueInputDto)
storyMapId_name?: TagStoryMapIdNameUniqueInputDto ;
}
