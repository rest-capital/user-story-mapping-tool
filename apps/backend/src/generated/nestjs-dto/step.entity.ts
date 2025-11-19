
import {ApiProperty} from '@nestjs/swagger'
import {Journey} from './journey.entity'
import {Story} from './story.entity'


export class Step {
  @ApiProperty({
  type: 'string',
})
id: string ;
@ApiProperty({
  type: 'string',
})
journeyId: string ;
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
  type: () => Journey,
  required: false,
})
journey?: Journey ;
@ApiProperty({
  type: () => Story,
  isArray: true,
  required: false,
})
stories?: Story[] ;
}
