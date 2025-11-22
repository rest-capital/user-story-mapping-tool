
import {ApiProperty} from '@nestjs/swagger'
import {Journey} from './journey.entity'
import {Release} from './release.entity'
import {Tag} from './tag.entity'
import {Persona} from './persona.entity'


export class StoryMap {
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
  isArray: true,
  required: false,
})
journeys?: Journey[] ;
@ApiProperty({
  type: () => Release,
  isArray: true,
  required: false,
})
releases?: Release[] ;
@ApiProperty({
  type: () => Tag,
  isArray: true,
  required: false,
})
tags?: Tag[] ;
@ApiProperty({
  type: () => Persona,
  isArray: true,
  required: false,
})
personas?: Persona[] ;
}
