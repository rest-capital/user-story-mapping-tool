
import {ApiExtraModels,ApiProperty} from '@nestjs/swagger'
import {IsBoolean,IsNotEmpty,IsOptional,IsString,ValidateNested} from 'class-validator'
import {Type} from 'class-transformer'

export class ReleaseUniqueUnassignedUniqueInputDto {
    @ApiProperty({
  type: 'boolean',
  default: false,
})
@IsNotEmpty()
@IsBoolean()
isUnassigned: boolean ;
  }

@ApiExtraModels(ReleaseUniqueUnassignedUniqueInputDto)
export class ConnectReleaseDto {
  @ApiProperty({
  type: 'string',
  required: false,
})
@IsOptional()
@IsString()
id?: string ;
@ApiProperty({
  type: 'boolean',
  required: false,
})
@IsOptional()
@IsBoolean()
isUnassigned?: boolean ;
@ApiProperty({
  type: ReleaseUniqueUnassignedUniqueInputDto,
  required: false,
})
@IsOptional()
@ValidateNested()
@Type(() => ReleaseUniqueUnassignedUniqueInputDto)
unique_unassigned?: ReleaseUniqueUnassignedUniqueInputDto ;
}
