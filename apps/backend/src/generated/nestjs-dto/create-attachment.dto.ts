
import {ApiProperty} from '@nestjs/swagger'
import {IsInt,IsNotEmpty,IsString} from 'class-validator'




export class CreateAttachmentDto {
  @ApiProperty({
  type: 'string',
})
@IsNotEmpty()
@IsString()
fileName: string ;
@ApiProperty({
  type: 'string',
})
@IsNotEmpty()
@IsString()
fileUrl: string ;
@ApiProperty({
  type: 'string',
})
@IsNotEmpty()
@IsString()
fileType: string ;
@ApiProperty({
  type: 'integer',
  format: 'int32',
})
@IsNotEmpty()
@IsInt()
fileSize: number ;
@ApiProperty({
  type: 'string',
})
@IsNotEmpty()
@IsString()
createdBy: string ;
}
