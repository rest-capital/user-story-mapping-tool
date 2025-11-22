import { Module } from '@nestjs/common';
import { StoryMapsService } from './story-maps.service';
import { StoryMapsController } from './story-maps.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [PrismaModule, SupabaseModule],
  controllers: [StoryMapsController],
  providers: [StoryMapsService],
  exports: [StoryMapsService],
})
export class StoryMapsModule {}
