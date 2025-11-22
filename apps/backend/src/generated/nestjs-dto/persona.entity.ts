
import {ApiProperty} from '@nestjs/swagger'
import {StoryMap} from './story-map.entity'
import {StoryPersona} from './story-persona.entity'


export class Persona {
  @ApiProperty({
  type: 'string',
})
id: string ;
@ApiProperty({
  type: 'string',
})
storyMapId: string ;
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
  nullable: true,
})
avatarUrl: string  | null;
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
  type: () => StoryMap,
  required: false,
})
storyMap?: StoryMap ;
@ApiProperty({
  type: () => StoryPersona,
  isArray: true,
  required: false,
})
stories?: StoryPersona[] ;
}
