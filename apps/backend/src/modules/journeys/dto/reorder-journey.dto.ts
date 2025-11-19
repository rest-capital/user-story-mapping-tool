import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

/**
 * DTO for reordering a journey
 * Updates the sort_order to change position in the list
 */
export class ReorderJourneyDto {
  @ApiProperty({
    description: 'New sort order position (0-based)',
    example: 2,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  new_sort_order!: number;
}
