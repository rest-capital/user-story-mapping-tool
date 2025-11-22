import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({
    description: 'Story map ID (workspace scoping)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  story_map_id!: string;

  @ApiProperty({
    description: 'Tag name (unique within story map)',
    example: 'Frontend',
  })
  @IsString()
  name!: string;
}
