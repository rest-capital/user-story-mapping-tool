
import {ApiProperty} from '@nestjs/swagger'
import {IsOptional,IsString} from 'class-validator'




export class ConnectPersonaDto {
  @ApiProperty({
  type: 'string',
  required: false,
})
@IsOptional()
@IsString()
id?: string ;
@ApiProperty({
  type: 'string',
  required: false,
})
@IsOptional()
@IsString()
name?: string ;
}
