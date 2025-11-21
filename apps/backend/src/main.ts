import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { apiReference } from '@scalar/nestjs-api-reference';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Exception filter (catches all exceptions and maps to HTTP status codes)
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS
  app.enableCors();

  // API documentation with Scalar
  const config = new DocumentBuilder()
    .setTitle('User Story Mapping API')
    .setDescription('API for User Story Mapping Tool')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth')
    .addTag('health')
    .addTag('journeys')
    .addTag('steps')
    .addTag('releases')
    .addTag('stories')
    .addTag('tags')
    .addTag('personas')
    .addTag('comments')
    .addTag('story-links')
    .addTag('user-stories')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Use Scalar for modern API documentation
  app.use(
    '/api/docs',
    apiReference({
      spec: {
        content: document,
      },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
