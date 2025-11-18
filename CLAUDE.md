# User Story Mapping Tool - Backend Guide

**Context**: You are working on **BACKEND** code for a collaborative story mapping tool.

**CRITICAL**: Follow these instructions when implementing API endpoints, services, database schema, or business logic.

---

## 🎯 Backend Tech Stack

- **Framework**: Express.js with TypeScript (or NestJS if preferred)
- **API**: REST endpoints (simple and straightforward)
- **Database**: PostgreSQL hosted on Supabase, accessed via Prisma ORM
- **Auth**: Supabase Auth (JWT validation)
- **Real-time**: WebSocket support for collaborative features (future)

**Note**: Supabase provides both the PostgreSQL database hosting AND authentication. Your backend connects to Supabase's PostgreSQL using Prisma, and verifies JWTs issued by Supabase Auth.

---

## 🔧 Supabase + Prisma Setup

### Database Connection

```typescript
// .env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT_REF].supabase.co:5432/postgres"
SUPABASE_URL="https://[PROJECT_REF].supabase.co"
SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
```

### Prisma Configuration

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Your models here...
model Story {
  id          String   @id @default(uuid())
  step_id     String
  release_id  String
  title       String
  // ... rest of fields
}
```

### Architecture Flow

```
Frontend (React)
    ↓ JWT token (from Supabase Auth)
Backend API (Express)
    ↓ Verifies JWT with Supabase
    ↓ Queries database with Prisma
Supabase PostgreSQL
    ← Connected via DATABASE_URL
```

**Key Points**:
- ✅ Use Prisma to define schema and query database
- ✅ Use Supabase Auth SDK to verify JWTs
- ✅ Supabase hosts PostgreSQL - you just connect via connection string
- ✅ No need for Supabase client in backend (except for auth verification)
- ✅ Prisma migrations will run against Supabase PostgreSQL

---

## 🏗️ Architectural Principles

### Keep It Simple

This is an MVP. We prioritize:
1. **Clean separation of concerns** - Easy to understand and modify
2. **No over-engineering** - No microservices, no event sourcing, no complex patterns
3. **Maintainable code** - Future developers should understand it quickly
4. **Type safety** - TypeScript everywhere

### The 3-Layer Pattern

```
Route Handler (HTTP Layer)
    ↓ delegates to
Service (Business Logic)
    ↓ uses
Prisma (Data Access)
```

**Golden Rule**: If unsure where code belongs, ask:
- Is it about HTTP request/response? → Route Handler
- Is it business logic? → Service
- Is it database access? → Prisma call in Service

**Never mix layers. Never create repositories. Always enforce separation.**

---

## Layer 1: Route Handler (`*.routes.ts`)

### ✅ Route Handler SHOULD:
- Handle HTTP requests and responses
- Extract user context from JWT (via middleware)
- Apply auth middleware
- Validate request body/params (using Zod or similar)
- **Delegate to service immediately**
- Return service results with appropriate HTTP status

### ❌ Route Handler SHOULD NOT:
- Contain business logic (if statements about status, calculations, etc.)
- Make database queries directly
- Call external APIs

### Route Handler Template

```typescript
// routes/stories.routes.ts
import { Router } from 'express';
import { authenticateJWT } from '@/middleware/auth';
import { StoryService } from '@/services/story.service';
import { CreateStorySchema, UpdateStorySchema } from '@/validation/story.schema';

const router = Router();
const storyService = new StoryService();

// Get all stories for a cell
router.get(
  '/stories',
  authenticateJWT,
  async (req, res, next) => {
    try {
      const { step_id, release_id } = req.query;
      
      // ✅ Just delegate to service
      const stories = await storyService.getStoriesByCell(
        step_id as string,
        release_id as string
      );
      
      res.json(stories);
    } catch (error) {
      next(error); // Error middleware handles this
    }
  }
);

// Create a story
router.post(
  '/stories',
  authenticateJWT,
  async (req, res, next) => {
    try {
      // ✅ Validate input
      const validatedData = CreateStorySchema.parse(req.body);
      
      // ✅ Pass user context from JWT
      const story = await storyService.createStory(
        validatedData,
        req.user.id // From JWT middleware
      );
      
      res.status(201).json(story);
    } catch (error) {
      next(error);
    }
  }
);

// Update a story
router.patch(
  '/stories/:id',
  authenticateJWT,
  async (req, res, next) => {
    try {
      const validatedData = UpdateStorySchema.parse(req.body);
      
      const story = await storyService.updateStory(
        req.params.id,
        validatedData,
        req.user.id
      );
      
      res.json(story);
    } catch (error) {
      next(error);
    }
  }
);

// Delete a story (with dependency cleanup)
router.delete(
  '/stories/:id',
  authenticateJWT,
  async (req, res, next) => {
    try {
      const result = await storyService.deleteStory(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

---

## Layer 2: Service (`*.service.ts`)

### ✅ Service SHOULD:
- Extend `BaseService` (for DRY error handling)
- Contain ALL business logic
- Validate business rules
- Make database queries via Prisma
- Handle complex operations (like moving stories, cascade deletes)
- Calculate derived data (like release stats)

### ❌ Service SHOULD NOT:
- Handle HTTP concerns (status codes, headers, etc.)
- Use Express types (Request, Response)
- Inject other domain services (creates coupling)

### Service Template (with BaseService)

```typescript
// services/story.service.ts
import { BaseService } from '@/common/base.service';
import { PrismaService } from '@/shared/prisma.service';
import { StoryError } from './story.error';
import type { CreateStoryInput, UpdateStoryInput } from '@/types/story.types';

export class StoryService extends BaseService {
  constructor() {
    super(new PrismaService());
  }

  /**
   * Define how to create domain errors
   */
  protected createDomainError(message: string, cause?: Error): Error {
    return new StoryError(message, cause);
  }

  /**
   * Get stories by cell (step + release)
   */
  async getStoriesByCell(stepId: string, releaseId: string) {
    return this.executeOperation(
      async () => {
        // ✅ Business logic: validate cell exists
        const step = await this.prisma.step.findUnique({
          where: { id: stepId }
        });
        
        if (!step) {
          throw new StoryError('Step not found');
        }

        const release = await this.prisma.release.findUnique({
          where: { id: releaseId }
        });
        
        if (!release) {
          throw new StoryError('Release not found');
        }

        // ✅ Fetch stories with relationships
        return this.prisma.story.findMany({
          where: {
            step_id: stepId,
            release_id: releaseId
          },
          include: {
            tags: true,
            personas: true,
            dependencies: {
              include: {
                target: true // Include target story details
              }
            },
            comments: {
              orderBy: { created_at: 'desc' }
            }
          },
          orderBy: { sort_order: 'asc' }
        });
      },
      'getStoriesByCell',
      { stepId, releaseId }
    );
  }

  /**
   * Create a new story with proper sort order
   */
  async createStory(input: CreateStoryInput, userId: string) {
    this.validateRequired(input.step_id, 'step_id');
    this.validateRequired(input.release_id, 'release_id');
    this.validateRequired(input.title, 'title');

    return this.executeOperation(
      async () => {
        // ✅ Business rule: calculate next sort_order
        const existingStories = await this.prisma.story.count({
          where: {
            step_id: input.step_id,
            release_id: input.release_id
          }
        });

        // Stories use 1000-based spacing
        const sortOrder = (existingStories + 1) * 1000;

        // ✅ Create with defaults
        return this.prisma.story.create({
          data: {
            step_id: input.step_id,
            release_id: input.release_id,
            title: input.title,
            description: input.description || '',
            status: input.status || 'NOT_READY',
            sort_order: sortOrder,
            created_by: userId,
            // Default label
            label: {
              id: 'default-label',
              name: 'Story',
              color: '#3B82F6'
            }
          },
          include: {
            tags: true,
            personas: true
          }
        });
      },
      'createStory',
      { stepId: input.step_id, releaseId: input.release_id }
    );
  }

  /**
   * Update story with validation
   */
  async updateStory(
    storyId: string,
    input: UpdateStoryInput,
    userId: string
  ) {
    this.validateRequired(storyId, 'storyId');

    return this.executeOperation(
      async () => {
        const story = await this.prisma.story.findUnique({
          where: { id: storyId }
        });

        if (!story) {
          throw new StoryError('Story not found');
        }

        // ✅ Business rule: if moving, recalculate sort_order
        if (input.step_id || input.release_id) {
          const newStepId = input.step_id || story.step_id;
          const newReleaseId = input.release_id || story.release_id;

          const storiesInNewCell = await this.prisma.story.count({
            where: {
              step_id: newStepId,
              release_id: newReleaseId
            }
          });

          input.sort_order = (storiesInNewCell + 1) * 1000;
        }

        return this.prisma.story.update({
          where: { id: storyId },
          data: {
            ...input,
            updated_by: userId
          },
          include: {
            tags: true,
            personas: true,
            dependencies: true
          }
        });
      },
      'updateStory',
      { storyId }
    );
  }

  /**
   * Delete story with dependency cleanup (CRITICAL)
   */
  async deleteStory(storyId: string) {
    this.validateRequired(storyId, 'storyId');

    return this.executeInTransaction(
      async (tx) => {
        // ✅ CRITICAL: Remove from ALL dependencies (both directions)
        const deletedDeps = await tx.storyLink.deleteMany({
          where: {
            OR: [
              { source_story_id: storyId },
              { target_story_id: storyId }
            ]
          }
        });

        // ✅ Delete comments
        await tx.comment.deleteMany({
          where: { story_id: storyId }
        });

        // ✅ Delete attachments
        await tx.attachment.deleteMany({
          where: { story_id: storyId }
        });

        // ✅ Finally delete the story
        await tx.story.delete({
          where: { id: storyId }
        });

        return {
          success: true,
          dependencies_removed: deletedDeps.count
        };
      },
      'deleteStory',
      { storyId }
    );
  }
}
```

---

## 🧱 BaseService Pattern (MANDATORY)

**All services MUST extend BaseService** to eliminate boilerplate and ensure consistent error handling.

### What BaseService Provides

- ✅ **Automatic try-catch** - No manual error handling needed (60% code reduction)
- ✅ **Prisma error translation** - P2002 → "already exists", P2025 → "not found"
- ✅ **Structured logging** - Operation start/completion/failure logs
- ✅ **Transaction wrapper** - Clean transaction handling with auto-rollback
- ✅ **Validation helpers** - Common validation patterns
- ✅ **Performance timing** - Track operation duration

### Complete BaseService Implementation

```typescript
// common/base.service.ts
import { PrismaService } from '@/shared/prisma.service';

/**
 * Base class for all services
 * Provides error handling, logging, and common utilities
 */
export abstract class BaseService {
  protected prisma: PrismaService;
  protected logger: {
    debug: (message: string, context?: any) => void;
    log: (message: string, context?: any) => void;
    error: (message: string, trace?: string, context?: any) => void;
    warn: (message: string, context?: any) => void;
  };

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
    
    // Simple logger implementation (or use your preferred logger)
    const serviceName = this.constructor.name;
    this.logger = {
      debug: (msg, ctx) => console.debug(`[${serviceName}] ${msg}`, ctx || ''),
      log: (msg, ctx) => console.log(`[${serviceName}] ${msg}`, ctx || ''),
      error: (msg, trace, ctx) => console.error(`[${serviceName}] ${msg}`, trace, ctx),
      warn: (msg, ctx) => console.warn(`[${serviceName}] ${msg}`, ctx || ''),
    };
  }

  /**
   * Must be implemented by child classes
   * Defines how to create domain-specific errors
   */
  protected abstract createDomainError(
    message: string,
    cause?: Error,
    context?: any
  ): Error;

  /**
   * Execute operation with automatic error handling and logging
   * 
   * Benefits:
   * - No manual try-catch needed
   * - Automatic Prisma error translation
   * - Structured logging
   * - Performance tracking
   * 
   * @example
   * async getStory(id: string) {
   *   return this.executeOperation(
   *     () => this.prisma.story.findUnique({ where: { id } }),
   *     'getStory',
   *     { storyId: id }
   *   );
   * }
   */
  protected async executeOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    this.logger.debug(`Starting ${operationName}`, context);
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      this.logger.log(
        `${operationName} completed successfully in ${duration}ms`
      );
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `${operationName} failed after ${duration}ms`,
        error.stack,
        context
      );

      // Translate Prisma errors to user-friendly messages
      if (error.code) {
        switch (error.code) {
          case 'P2002':
            // Unique constraint violation
            const field = error.meta?.target?.[0] || 'field';
            throw this.createDomainError(
              `A record with this ${field} already exists`,
              error,
              context
            );
          
          case 'P2025':
            // Record not found
            throw this.createDomainError(
              'Record not found',
              error,
              context
            );
          
          case 'P2003':
            // Foreign key constraint violation
            throw this.createDomainError(
              'Related record not found',
              error,
              context
            );
          
          case 'P2014':
            // Required relation violation
            throw this.createDomainError(
              'Cannot delete record due to related records',
              error,
              context
            );
          
          case 'P2021':
            // Table does not exist
            throw this.createDomainError(
              'Database table does not exist',
              error,
              context
            );
          
          case 'P2024':
            // Connection timeout
            throw this.createDomainError(
              'Database connection timeout',
              error,
              context
            );
        }
      }

      // Re-throw domain errors as-is (they're already user-friendly)
      if (error.name?.endsWith('Error') && error.message) {
        throw error;
      }

      // Wrap unknown errors
      throw this.createDomainError(
        'Operation failed unexpectedly',
        error,
        context
      );
    }
  }

  /**
   * Execute operation in transaction with automatic rollback on error
   * 
   * @example
   * async moveStory(storyId: string, newReleaseId: string) {
   *   return this.executeInTransaction(
   *     async (tx) => {
   *       const story = await tx.story.update({...});
   *       await tx.storyLink.updateMany({...});
   *       return story;
   *     },
   *     'moveStory',
   *     { storyId, newReleaseId }
   *   );
   * }
   */
  protected async executeInTransaction<T>(
    operation: (tx: any) => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    this.logger.debug(`Starting transaction: ${operationName}`, context);

    try {
      const result = await this.prisma.$transaction(operation);
      const duration = Date.now() - startTime;
      this.logger.log(
        `Transaction ${operationName} completed in ${duration}ms`
      );
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Transaction ${operationName} failed after ${duration}ms (rolled back)`,
        error.stack,
        context
      );
      
      // Prisma automatically rolls back on error
      throw this.createDomainError(
        'Transaction failed',
        error,
        context
      );
    }
  }

  /**
   * Time an operation without the full executeOperation wrapper
   * Useful for simple operations that don't need error translation
   */
  protected async timeOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = Date.now();
    try {
      return await operation();
    } finally {
      const duration = Date.now() - startTime;
      this.logger.debug(`${operationName} took ${duration}ms`);
    }
  }

  // ==================== VALIDATION HELPERS ====================

  /**
   * Validate that a value is provided
   */
  protected validateRequired(
    value: any,
    fieldName: string,
    entity?: string
  ): void {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      const entityMsg = entity ? ` for ${entity}` : '';
      throw this.createDomainError(`${fieldName} is required${entityMsg}`);
    }
  }

  /**
   * Validate that an array is not empty
   */
  protected validateNotEmpty(
    array: any[],
    fieldName: string,
    entity?: string
  ): void {
    if (!array || array.length === 0) {
      const entityMsg = entity ? ` for ${entity}` : '';
      throw this.createDomainError(`${fieldName} cannot be empty${entityMsg}`);
    }
  }

  /**
   * Validate that a number is positive
   */
  protected validatePositive(
    value: number,
    fieldName: string
  ): void {
    if (value <= 0) {
      throw this.createDomainError(`${fieldName} must be positive`);
    }
  }

  /**
   * Validate that a value is within a range
   */
  protected validateRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): void {
    if (value < min || value > max) {
      throw this.createDomainError(
        `${fieldName} must be between ${min} and ${max}`
      );
    }
  }

  /**
   * Validate that two values match (e.g., min <= max)
   */
  protected validateOrder(
    minValue: number,
    maxValue: number,
    minField: string,
    maxField: string
  ): void {
    if (minValue > maxValue) {
      throw this.createDomainError(
        `${minField} cannot exceed ${maxField}`
      );
    }
  }

  /**
   * Validate that a value is one of allowed options
   */
  protected validateEnum<T>(
    value: T,
    allowedValues: T[],
    fieldName: string
  ): void {
    if (!allowedValues.includes(value)) {
      throw this.createDomainError(
        `${fieldName} must be one of: ${allowedValues.join(', ')}`
      );
    }
  }
}
```

---

## 📦 Domain Error Classes

Each module should define its own error class:

```typescript
// services/story.error.ts
export class StoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'StoryError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// services/release.error.ts
export class ReleaseError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ReleaseError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// services/journey.error.ts
export class JourneyError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'JourneyError';
    Error.captureStackTrace(this, this.constructor);
  }
}
```

---

## 🎨 Usage Examples

### Basic Service Using BaseService

```typescript
// services/story.service.ts
import { BaseService } from '@/common/base.service';
import { StoryError } from './story.error';

export class StoryService extends BaseService {
  /**
   * Define domain error creator
   */
  protected createDomainError(
    message: string,
    cause?: Error,
    context?: any
  ): Error {
    return new StoryError(message, cause, context);
  }

  /**
   * Simple query - no try-catch needed!
   */
  async getStoryById(storyId: string) {
    this.validateRequired(storyId, 'storyId', 'Story');

    return this.executeOperation(
      () => this.prisma.story.findUniqueOrThrow({
        where: { id: storyId },
        include: {
          tags: true,
          personas: true,
          dependencies: true,
        }
      }),
      'getStoryById',
      { storyId }
    );
    // ✅ Automatic error handling
    // ✅ Automatic logging
    // ✅ Prisma errors translated
  }

  /**
   * Complex operation with validation
   */
  async updateStory(storyId: string, data: UpdateStoryInput) {
    this.validateRequired(storyId, 'storyId');
    
    // Custom validation using helpers
    if (data.size) {
      this.validatePositive(data.size, 'size');
    }

    return this.executeOperation(
      async () => {
        const story = await this.prisma.story.findUnique({
          where: { id: storyId }
        });

        if (!story) {
          throw new StoryError('Story not found');
        }

        return this.prisma.story.update({
          where: { id: storyId },
          data,
        });
      },
      'updateStory',
      { storyId, updates: Object.keys(data) }
    );
  }

  /**
   * Transaction example - automatic rollback on error
   */
  async moveStory(
    storyId: string,
    newStepId: string,
    newReleaseId: string
  ) {
    this.validateRequired(storyId, 'storyId');
    this.validateRequired(newStepId, 'newStepId');
    this.validateRequired(newReleaseId, 'newReleaseId');

    return this.executeInTransaction(
      async (tx) => {
        // Get current position
        const story = await tx.story.findUniqueOrThrow({
          where: { id: storyId }
        });

        // Calculate new sort order
        const storiesInNewCell = await tx.story.count({
          where: {
            step_id: newStepId,
            release_id: newReleaseId
          }
        });

        const newSortOrder = (storiesInNewCell + 1) * 1000;

        // Update story
        return tx.story.update({
          where: { id: storyId },
          data: {
            step_id: newStepId,
            release_id: newReleaseId,
            sort_order: newSortOrder
          }
        });
      },
      'moveStory',
      { storyId, newStepId, newReleaseId }
    );
    // ✅ Automatic rollback if any operation fails
  }
}
```

### Before vs After BaseService

#### ❌ Before (Manual Error Handling)

```typescript
async getStoryById(storyId: string) {
  try {
    this.logger.debug('Getting story', { storyId });
    
    if (!storyId) {
      throw new StoryError('storyId is required');
    }

    const story = await this.prisma.story.findUnique({
      where: { id: storyId }
    });

    if (!story) {
      throw new StoryError('Story not found');
    }

    this.logger.log('Story retrieved successfully');
    return story;
  } catch (error) {
    this.logger.error('Failed to get story', error.stack, { storyId });
    
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new StoryError('Story not found');
      }
    }
    
    if (error instanceof StoryError) {
      throw error;
    }
    
    throw new StoryError('Failed to get story', error);
  }
}
// 35 lines of boilerplate!
```

#### ✅ After (With BaseService)

```typescript
async getStoryById(storyId: string) {
  this.validateRequired(storyId, 'storyId');
  
  return this.executeOperation(
    () => this.prisma.story.findUniqueOrThrow({
      where: { id: storyId }
    }),
    'getStoryById',
    { storyId }
  );
}
// 12 lines - 66% reduction!
```

---

## Layer 3: Prisma (Data Access)

### ✅ Prisma SHOULD:
- Be injected into services only
- Handle all database queries
- Handle transactions
- Be used directly (no wrapper repositories)

### ❌ Prisma SHOULD NOT:
- Be used in route handlers
- Be wrapped in custom repository classes
- Contain business logic

**Key Point**: Prisma IS the repository pattern. Don't create separate repository layers.

---

## 🔐 Authentication Middleware

```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify JWT with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name || '',
      avatar_url: user.user_metadata?.avatar_url || ''
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
}
```

---

## 💬 Comment Endpoint Example (Auth Pattern)

```typescript
// routes/comments.routes.ts
router.post(
  '/stories/:storyId/comments',
  authenticateJWT,
  async (req, res, next) => {
    try {
      // ✅ Frontend sends ONLY content
      const { content } = req.body;
      
      // ✅ Backend extracts user from JWT (via middleware)
      const comment = await commentService.createComment({
        story_id: req.params.storyId,
        content,
        author_id: req.user.id,      // From JWT
        author: req.user.name,        // From JWT
        avatar_url: req.user.avatar_url // From JWT
      });

      // ✅ Backend adds is_current_user flag
      res.status(201).json({
        ...comment,
        is_current_user: true // Always true for creator
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/stories/:storyId/comments',
  authenticateJWT,
  async (req, res, next) => {
    try {
      const comments = await commentService.getCommentsByStory(
        req.params.storyId
      );

      // ✅ Add is_current_user flag to each comment
      const commentsWithFlag = comments.map(comment => ({
        ...comment,
        is_current_user: comment.author_id === req.user.id
      }));

      res.json(commentsWithFlag);
    } catch (error) {
      next(error);
    }
  }
);
```

---

## 🗑️ Critical Delete Operations

### Release Delete (Move Stories First)

```typescript
// services/release.service.ts
async deleteRelease(releaseId: string) {
  this.validateRequired(releaseId, 'releaseId');

  return this.executeInTransaction(
    async (tx) => {
      // ✅ Check if it's the Unassigned release
      const release = await tx.release.findUnique({
        where: { id: releaseId }
      });

      if (!release) {
        throw new ReleaseError('Release not found');
      }

      if (release.is_unassigned) {
        throw new ReleaseError('Cannot delete Unassigned release');
      }

      // ✅ CRITICAL: Move stories to Unassigned FIRST
      const unassigned = await tx.release.findFirst({
        where: { is_unassigned: true }
      });

      const result = await tx.story.updateMany({
        where: { release_id: releaseId },
        data: { release_id: unassigned!.id }
      });

      // ✅ Now safe to delete release
      await tx.release.delete({
        where: { id: releaseId }
      });

      return {
        success: true,
        stories_moved: result.count
      };
    },
    'deleteRelease',
    { releaseId }
  );
}
```

---

## 📁 Project Structure

```
src/
├── routes/                    # Layer 1: HTTP handlers
│   ├── journeys.routes.ts
│   ├── steps.routes.ts
│   ├── stories.routes.ts
│   ├── releases.routes.ts
│   ├── comments.routes.ts
│   └── index.ts              # Combine all routes
├── services/                  # Layer 2: Business logic
│   ├── journey.service.ts
│   ├── step.service.ts
│   ├── story.service.ts
│   ├── release.service.ts
│   └── comment.service.ts
├── common/                    # Shared utilities
│   ├── base.service.ts       # Base class for services
│   └── errors.ts             # Domain error classes
├── middleware/
│   ├── auth.ts               # JWT authentication
│   └── error-handler.ts      # Global error handling
├── validation/               # Zod schemas
│   ├── story.schema.ts
│   └── comment.schema.ts
├── types/                    # TypeScript types
│   ├── story.types.ts
│   └── user.types.ts
├── shared/
│   └── prisma.service.ts     # Prisma client wrapper
└── server.ts                 # Express app setup
```

---

## 🚫 Common Mistakes (AVOID)

### ❌ Fat Route Handler (BAD)
```typescript
router.post('/stories', async (req, res) => {
  // ❌ Business logic in route handler
  if (req.body.size < 1) {
    return res.status(400).json({ error: 'Invalid size' });
  }

  // ❌ Database query in route handler
  const story = await prisma.story.create({
    data: req.body
  });

  res.json(story);
});
```

### ✅ Thin Route Handler (GOOD)
```typescript
router.post('/stories', authenticateJWT, async (req, res, next) => {
  try {
    const validatedData = CreateStorySchema.parse(req.body);
    // ✅ Just delegate to service
    const story = await storyService.createStory(
      validatedData,
      req.user.id
    );
    res.status(201).json(story);
  } catch (error) {
    next(error);
  }
});
```

---

### ❌ Manual Try-Catch Everywhere (BAD)
```typescript
async getStories() {
  try {
    this.logger.debug('Getting stories');
    const stories = await this.prisma.story.findMany();
    this.logger.log('Stories retrieved');
    return stories;
  } catch (error) {
    this.logger.error('Failed to get stories', error.stack);
    throw new StoryError('Failed to get stories');
  }
}
// Boilerplate repeated in every method!
```

### ✅ BaseService Wrapper (GOOD)
```typescript
async getStories() {
  return this.executeOperation(
    () => this.prisma.story.findMany(),
    'getStories'
  );
}
// Clean and DRY!
```

---

## ✅ Backend Quality Checklist

Before committing backend code, verify:

**Architecture**:
- [ ] Route handlers are thin - only HTTP concerns, delegate to service
- [ ] Services extend BaseService - no manual try-catch
- [ ] Services contain business logic - no HTTP types in parameters
- [ ] Prisma only called from services - never from route handlers
- [ ] Used executeOperation() or executeInTransaction() wrappers
- [ ] No cross-service dependencies - use Prisma directly
- [ ] File structure matches pattern (routes/services/common)
- [ ] No custom repository classes

**Error Handling**:
- [ ] Created domain-specific error classes (StoryError, ReleaseError)
- [ ] User-friendly error messages (not "P2002")
- [ ] Global error handler middleware in place

**Auth**:
- [ ] All protected routes use authenticateJWT middleware
- [ ] User context extracted from JWT, never from request body
- [ ] Comments include is_current_user flag

**Critical Operations**:
- [ ] Release delete moves stories to Unassigned first
- [ ] Story delete removes all dependencies (both directions)
- [ ] Sort order calculated correctly (1000-based for stories)

**Code Quality**:
- [ ] TypeScript strict mode (no `any` types)
- [ ] Input validation with Zod schemas
- [ ] Max 250 lines per file
- [ ] Services are 150-300 lines (business logic lives here)

---

## 🎯 Success Criteria

Your backend is successful when:

1. **Follows 3-layer pattern** - Route→Service→Prisma
2. **Services extend BaseService** - No boilerplate try-catch
3. **Route handlers are thin** - Under 100 lines, just delegate
4. **Services are rich** - 150-300 lines, all business logic
5. **No coupling** - Services only depend on Prisma
6. **Auth is correct** - JWT verified, user context from token
7. **Critical deletes work** - Stories cleaned up, releases move to Unassigned
8. **Type-safe** - TypeScript everywhere, no `any`

---

## 📚 API Contract Reference

For complete API specifications, see:
- `DATA_MODEL_COMPREHENSIVE.md` - All endpoints and schemas
- `DATA_MODEL_QUICK_REFERENCE.md` - Quick lookup
- `DATA_MODEL_VISUAL_SUMMARY.md` - Visual diagrams

---

**Remember**: Simple, clean, maintainable. No over-engineering. Focus on the 3-layer pattern and you'll have a codebase that's easy to work with and extend.
