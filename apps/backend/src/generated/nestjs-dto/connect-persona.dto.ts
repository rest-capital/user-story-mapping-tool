
import {ApiExtraModels,ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty,IsOptional,IsString,ValidateNested} from 'class-validator'
import {Type} from 'class-transformer'

export class PersonaStoryMapIdNameUniqueInputDto {
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

@ApiExtraModels(PersonaStoryMapIdNameUniqueInputDto)
export class ConnectPersonaDto {
  @ApiProperty({
  type: 'string',
  required: false,
})
@IsOptional()
@IsString()
id?: string ;
@ApiProperty({
  type: PersonaStoryMapIdNameUniqueInputDto,
  required: false,
})
@IsOptional()
@ValidateNested()
@Type(() => PersonaStoryMapIdNameUniqueInputDto)
storyMapId_name?: PersonaStoryMapIdNameUniqueInputDto ;
}
