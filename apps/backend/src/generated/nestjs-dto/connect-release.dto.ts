
import {ApiExtraModels,ApiProperty} from '@nestjs/swagger'
import {IsBoolean,IsNotEmpty,IsOptional,IsString,ValidateNested} from 'class-validator'
import {Type} from 'class-transformer'

export class ReleaseStoryMapIdIsUnassignedUniqueInputDto {
    @ApiProperty({
  type: 'string',
})
@IsNotEmpty()
@IsString()
storyMapId: string ;
@ApiProperty({
  type: 'boolean',
  default: false,
})
@IsNotEmpty()
@IsBoolean()
isUnassigned: boolean ;
  }

@ApiExtraModels(ReleaseStoryMapIdIsUnassignedUniqueInputDto)
export class ConnectReleaseDto {
  @ApiProperty({
  type: 'string',
  required: false,
})
@IsOptional()
@IsString()
id?: string ;
@ApiProperty({
  type: ReleaseStoryMapIdIsUnassignedUniqueInputDto,
  required: false,
})
@IsOptional()
@ValidateNested()
@Type(() => ReleaseStoryMapIdIsUnassignedUniqueInputDto)
storyMapId_isUnassigned?: ReleaseStoryMapIdIsUnassignedUniqueInputDto ;
}
