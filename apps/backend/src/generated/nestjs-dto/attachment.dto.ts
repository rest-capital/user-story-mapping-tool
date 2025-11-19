
import {ApiProperty} from '@nestjs/swagger'


export class AttachmentDto {
  @ApiProperty({
  type: 'string',
})
id: string ;
@ApiProperty({
  type: 'string',
})
fileName: string ;
@ApiProperty({
  type: 'string',
})
fileUrl: string ;
@ApiProperty({
  type: 'string',
})
fileType: string ;
@ApiProperty({
  type: 'integer',
  format: 'int32',
})
fileSize: number ;
@ApiProperty({
  type: 'string',
  format: 'date-time',
})
createdAt: Date ;
@ApiProperty({
  type: 'string',
})
createdBy: string ;
}
