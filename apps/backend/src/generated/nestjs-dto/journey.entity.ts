
import {ApiProperty} from '@nestjs/swagger'
import {Step} from './step.entity'


export class Journey {
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
  type: 'integer',
  format: 'int32',
})
sortOrder: number ;
@ApiProperty({
  type: 'string',
})
color: string ;
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
  type: () => Step,
  isArray: true,
  required: false,
})
steps?: Step[] ;
}
