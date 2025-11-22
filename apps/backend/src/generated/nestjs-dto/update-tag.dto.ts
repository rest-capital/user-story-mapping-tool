
import {ApiProperty} from '@nestjs/swagger'
import {IsOptional,IsString} from 'class-validator'




export class UpdateTagDto {
  @ApiProperty({
  type: 'string',
  required: false,
})
@IsOptional()
@IsString()
name?: string ;
@ApiProperty({
  type: 'string',
  required: false,
})
@IsOptional()
@IsString()
createdBy?: string ;
@ApiProperty({
  type: 'string',
  required: false,
  nullable: true,
})
@IsOptional()
@IsString()
updatedBy?: string  | null;
}
