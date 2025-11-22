import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinRoomDto {
  @ApiProperty({ description: 'Story map ID to join' })
  @IsUUID()
  mapId!: string;
}
