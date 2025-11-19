import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreatePersonaDto {
  @ApiProperty({
    description: 'Persona name',
    example: 'Admin User',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Persona description',
    required: false,
    default: '',
    example: 'System administrator with full access',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Avatar image URL',
    required: false,
    example: 'https://example.com/avatars/admin.png',
  })
  @IsOptional()
  @IsString()
  avatar_url?: string;
}
