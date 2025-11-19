import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health';
import { UserStoriesModule } from './modules/user-stories/user-stories.module';
import { AuthModule } from './modules/auth/auth.module';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { PrismaModule } from './modules/prisma';
import { JourneysModule } from './modules/journeys/journeys.module';
import { StepsModule } from './modules/steps/steps.module';
import { ReleasesModule } from './modules/releases/releases.module';
import { StoriesModule } from './modules/stories/stories.module';
import { TagsModule } from './modules/tags/tags.module';
import { PersonasModule } from './modules/personas/personas.module';
import { CommentsModule } from './modules/comments/comments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env.local', '../../.env'],
    }),
    PrismaModule,
    SupabaseModule,
    AuthModule,
    HealthModule,
    JourneysModule,
    StepsModule,
    ReleasesModule,
    StoriesModule,
    TagsModule,
    PersonasModule,
    CommentsModule,
    UserStoriesModule,
  ],
})
export class AppModule {}
