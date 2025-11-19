
import {StoryStatus} from '@prisma/client'
import {ApiProperty} from '@nestjs/swagger'
import {Step} from './step.entity'
import {Release} from './release.entity'
import {StoryTag} from './story-tag.entity'
import {StoryPersona} from './story-persona.entity'
import {Comment} from './comment.entity'
import {Attachment} from './attachment.entity'
import {StoryLink} from './story-link.entity'


export class Story {
  @ApiProperty({
  type: 'string',
})
id: string ;
@ApiProperty({
  type: 'string',
})
stepId: string ;
@ApiProperty({
  type: 'string',
})
releaseId: string ;
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
@ApiProperty({
  type: () => Step,
  required: false,
})
step?: Step ;
@ApiProperty({
  type: () => Release,
  required: false,
})
release?: Release ;
@ApiProperty({
  type: () => StoryTag,
  isArray: true,
  required: false,
})
tags?: StoryTag[] ;
@ApiProperty({
  type: () => StoryPersona,
  isArray: true,
  required: false,
})
personas?: StoryPersona[] ;
@ApiProperty({
  type: () => Comment,
  isArray: true,
  required: false,
})
comments?: Comment[] ;
@ApiProperty({
  type: () => Attachment,
  isArray: true,
  required: false,
})
attachments?: Attachment[] ;
@ApiProperty({
  type: () => StoryLink,
  isArray: true,
  required: false,
})
sourceLinks?: StoryLink[] ;
@ApiProperty({
  type: () => StoryLink,
  isArray: true,
  required: false,
})
targetLinks?: StoryLink[] ;
}
