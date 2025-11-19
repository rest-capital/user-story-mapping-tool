
import {ApiProperty} from '@nestjs/swagger'
import {Story} from './story.entity'
import {Persona} from './persona.entity'


export class StoryPersona {
  @ApiProperty({
  type: 'string',
})
storyId: string ;
@ApiProperty({
  type: 'string',
})
personaId: string ;
@ApiProperty({
  type: () => Story,
  required: false,
})
story?: Story ;
@ApiProperty({
  type: () => Persona,
  required: false,
})
persona?: Persona ;
}
