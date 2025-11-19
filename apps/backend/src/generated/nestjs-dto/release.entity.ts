
import {ApiProperty} from '@nestjs/swagger'
import {Story} from './story.entity'
import {Comment} from './comment.entity'


export class Release {
  @ApiProperty({
  type: 'string',
})
id: string ;
@ApiProperty({
  type: 'string',
})
name: string ;
@ApiProperty({
  type: 'string',
})
description: string ;
@ApiProperty({
  type: 'string',
  format: 'date-time',
  nullable: true,
})
startDate: Date  | null;
@ApiProperty({
  type: 'string',
  format: 'date-time',
  nullable: true,
})
dueDate: Date  | null;
@ApiProperty({
  type: 'boolean',
})
shipped: boolean ;
@ApiProperty({
  type: 'boolean',
})
isUnassigned: boolean ;
@ApiProperty({
  type: 'integer',
  format: 'int32',
})
sortOrder: number ;
@ApiProperty({
  type: 'string',
  format: 'date-time',
})
createdAt: Date ;
@ApiProperty({
  type: 'string',
  format: 'date-time',
})
updatedAt: Date ;
@ApiProperty({
  type: 'string',
})
createdBy: string ;
@ApiProperty({
  type: 'string',
  nullable: true,
})
updatedBy: string  | null;
@ApiProperty({
  type: () => Story,
  isArray: true,
  required: false,
})
stories?: Story[] ;
@ApiProperty({
  type: () => Comment,
  isArray: true,
  required: false,
})
comments?: Comment[] ;
}
