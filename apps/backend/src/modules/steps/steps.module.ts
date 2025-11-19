import { Module } from '@nestjs/common';
import { StepsController, JourneyStepsController } from './steps.controller';
import { StepsService } from './steps.service';
import { SupabaseModule } from '../supabase/supabase.module';

/**
 * Steps Module
 * Handles step/phase management within journeys
 *
 * Feature-based module containing:
 * - Controllers (HTTP endpoints for /steps and /journeys/:id/steps)
 * - Service (business logic)
 * - DTOs (data transfer objects)
 * - Entities (database types)
 */
@Module({
  imports: [SupabaseModule],
  controllers: [StepsController, JourneyStepsController],
  providers: [StepsService],
  exports: [StepsService], // Export for other modules if needed
})
export class StepsModule {}
