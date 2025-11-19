
import {StoryStatus} from '@prisma/client'
import {ApiProperty} from '@nestjs/swagger'


export class StoryDto {
  @ApiProperty({
  type: 'string',
})
id: string ;
@ApiProperty({
  type: 'string',
})
title: string ;
@ApiProperty({
  type: 'string',
})
description: string ;
@ApiProperty({
  enum: StoryStatus,
  enumName: 'StoryStatus',
})
status: StoryStatus ;
@ApiProperty({
  type: 'integer',
  format: 'int32',
  nullable: true,
})
size: number  | null;
@ApiProperty({
  type: 'integer',
  format: 'int32',
})
sortOrder: number ;
@ApiProperty({
  type: 'string',
  nullable: true,
})
labelId: string  | null;
@ApiProperty({
  type: 'string',
})
labelName: string ;
@ApiProperty({
  type: 'string',
})
labelColor: string ;
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
}
