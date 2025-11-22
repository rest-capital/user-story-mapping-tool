import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateStoryMapDto {
  @ApiProperty({ description: 'Story map name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Story map description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
