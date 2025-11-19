import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdatePersonaDto {
  @ApiProperty({
    description: 'Persona name',
    required: false,
    example: 'Admin User (updated)',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Persona description',
    required: false,
    example: 'Updated description...',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Avatar image URL',
    required: false,
    example: 'https://example.com/avatars/admin-new.png',
  })
  @IsOptional()
  @IsString()
  avatar_url?: string;
}
