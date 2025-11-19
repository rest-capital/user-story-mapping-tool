import { Module } from '@nestjs/common';
import { JourneysController } from './journeys.controller';
import { JourneysService } from './journeys.service';
import { SupabaseModule } from '../supabase/supabase.module';

/**
 * Journeys Module
 * Handles user journey/workflow management
 *
 * Feature-based module containing:
 * - Controller (HTTP endpoints)
 * - Service (business logic)
 * - DTOs (data transfer objects)
 * - Entities (database types)
 */
@Module({
  imports: [SupabaseModule],
  controllers: [JourneysController],
  providers: [JourneysService],
  exports: [JourneysService], // Export for other modules if needed
})
export class JourneysModule {}
