import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

/**
 * DTO for reordering a step
 * Updates the sort_order to change position within a journey
 */
export class ReorderStepDto {
  @ApiProperty({
    description: 'New sort order position (0-based)',
    example: 2,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  new_sort_order!: number;
}
