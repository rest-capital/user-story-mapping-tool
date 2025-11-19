import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';

/**
 * DTO for updating a step
 * All fields are optional (partial update)
 */
export class UpdateStepDto {
  @ApiProperty({
    description: 'Updated name of the step',
    example: 'Send and receive messages',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Updated description of the step',
    example: 'User sends and receives messages',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Updated sort order (for reordering within journey)',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
