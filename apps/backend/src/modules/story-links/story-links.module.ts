import { Module } from '@nestjs/common';
import { StoryLinksController } from './story-links.controller';
import { StoryLinksService } from './story-links.service';
import { SupabaseModule } from '../supabase/supabase.module';

/**
 * StoryLinks Module
 * Manages dependencies and relationships between stories
 *
 * Feature-based module containing:
 * - Controller (HTTP endpoints for story dependencies)
 * - Service (business logic for link management)
 * - DTOs (data transfer objects)
 * - Entities (database types)
 */
@Module({
  imports: [SupabaseModule],
  controllers: [StoryLinksController],
  providers: [StoryLinksService],
  exports: [StoryLinksService],
})
export class StoryLinksModule {}
