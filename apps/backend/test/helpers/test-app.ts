import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';

/**
 * Creates a NestJS test application instance
 * Applies same validation and middleware as production
 *
 * @returns Promise<INestApplication> - Initialized test app
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Apply global prefix (same as production)
  app.setGlobalPrefix('api');

  // Apply same validation pipes as production
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Apply global exception filter (same as production)
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable CORS (same as production)
  app.enableCors();

  await app.init();
  return app;
}
