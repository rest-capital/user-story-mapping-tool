
import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty,IsOptional,IsString} from 'class-validator'




export class CreateStoryMapDto {
  @ApiProperty({
  type: 'string',
})
@IsNotEmpty()
@IsString()
name: string ;
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
