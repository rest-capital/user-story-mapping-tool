
import {ApiProperty} from '@nestjs/swagger'
import {IsNotEmpty,IsOptional,IsString} from 'class-validator'




export class CreateCommentDto {
  @ApiProperty({
  type: 'string',
})
@IsNotEmpty()
@IsString()
authorId: string ;
@ApiProperty({
  type: 'string',
})
@IsNotEmpty()
@IsString()
author: string ;
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
content: string ;
}
