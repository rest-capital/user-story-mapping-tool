
import {ApiProperty} from '@nestjs/swagger'
import {Story} from './story.entity'


export class Attachment {
  @ApiProperty({
  type: 'string',
})
id: string ;
@ApiProperty({
  type: 'string',
})
storyId: string ;
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
@ApiProperty({
  type: () => Story,
  required: false,
})
story?: Story ;
}
