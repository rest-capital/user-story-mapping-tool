import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/**
 * DTO for creating a new step
 * Frontend sends this when creating a step under a journey
 */
export class CreateStepDto {
  @ApiProperty({
    description: 'ID of the parent journey',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  journey_id!: string;

  @ApiProperty({
    description: 'Name of the step',
    example: 'Send messages',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Optional description of the step',
    example: 'User sends messages to contacts',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
