import { IsString, IsOptional, IsEnum, IsUUID, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum StoryStatus {
  NOT_READY = 'NOT_READY',
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  BLOCKED = 'BLOCKED',
}

export class CreateStoryEventDto {
  @ApiProperty()
  @IsUUID()
  mapId!: string;

  @ApiProperty()
  @IsUUID()
  step_id!: string;

  @ApiProperty()
  @IsUUID()
  release_id!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: StoryStatus, required: false })
  @IsOptional()
  @IsEnum(StoryStatus)
  status?: StoryStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  size?: number;
}

export class UpdateStoryEventDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsUUID()
  mapId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: StoryStatus, required: false })
  @IsOptional()
  @IsEnum(StoryStatus)
  status?: StoryStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  size?: number;
}

export class MoveStoryEventDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsUUID()
  mapId!: string;

  @ApiProperty()
  @IsUUID()
  toStepId!: string;

  @ApiProperty()
  @IsUUID()
  toReleaseId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  newSortOrder?: number;
}

export class DeleteStoryEventDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsUUID()
  mapId!: string;
}
