
import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty,IsOptional,IsString} from 'class-validator'




export class CreatePersonaDto {
  @ApiProperty({
  type: 'string',
})
@IsNotEmpty()
@IsString()
name: string ;
@ApiProperty({
  type: 'string',
  required: false,
  nullable: true,
})
@IsOptional()
@IsString()
avatarUrl?: string  | null;
@ApiProperty({
  type: 'string',
})
@IsNotEmpty()
@IsString()
createdBy: string ;
@ApiProperty({
  type: 'string',
  required: false,
  nullable: true,
})
@IsOptional()
@IsString()
updatedBy?: string  | null;
}
