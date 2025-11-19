import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({
    description: 'Tag name (unique)',
    example: 'Frontend',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Tag color (hex code)',
    example: '#10B981',
    default: '#8B5CF6',
  })
  @IsString()
  color!: string;
}
