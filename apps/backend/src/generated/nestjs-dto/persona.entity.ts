
import {ApiProperty} from '@nestjs/swagger'
import {StoryPersona} from './story-persona.entity'


export class Persona {
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
  nullable: true,
})
avatarUrl: string  | null;
@ApiProperty({
  type: 'string',
  format: 'date-time',
})
createdAt: Date ;
@ApiProperty({
  type: () => StoryPersona,
  isArray: true,
  required: false,
})
stories?: StoryPersona[] ;
}
