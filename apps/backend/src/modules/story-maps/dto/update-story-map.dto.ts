import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateStoryMapDto {
  @ApiProperty({ description: 'Story map name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Story map description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
