import { ApiProperty } from '@nestjs/swagger';

export class StoryMapResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() created_at!: Date;
  @ApiProperty() updated_at!: Date;
  @ApiProperty() created_by!: string;
  @ApiProperty() updated_by!: string | null;
}
