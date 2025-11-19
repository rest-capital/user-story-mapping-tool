import { ApiProperty } from '@nestjs/swagger';

export class TagResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Tag name',
    example: 'Frontend',
  })
  name!: string;

  @ApiProperty({
    description: 'Tag color (hex code)',
    example: '#10B981',
  })
  color!: string;

  @ApiProperty({
    description: 'Timestamp of creation',
    example: '2025-11-18T10:30:00Z',
  })
  created_at!: Date;
}
