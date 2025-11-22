import { Injectable } from '@nestjs/common';
import { BaseService } from '../../common/base.service';
import { PrismaService } from '../prisma/prisma.service';
import { CollaborationError } from './errors/collaboration.error';

@Injectable()
export class CollaborationService extends BaseService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected createDomainError(
    message: string,
    cause?: Error,
    context?: any,
  ): Error {
    return new CollaborationError(message, cause, context);
  }

  /**
   * Check if user has access to a story map
   *
   * TODO: CRITICAL - StoryMap model doesn't exist in schema!
   * The plan assumes a StoryMap model for room isolation, but the current
   * schema only has Journey/Step/Release/Story. Need to either:
   * 1. Add StoryMap model to schema, OR
   * 2. Use Journey as the isolation boundary, OR
   * 3. Use a different room structure
   *
   * For now, returning true to allow compilation. This MUST be fixed before production!
   */
  async hasMapAccess(userId: string, mapId: string): Promise<boolean> {
    this.validateRequired(userId, 'userId');
    this.validateRequired(mapId, 'mapId');

    // TEMPORARY: Bypass permission check until StoryMap model exists
    return Promise.resolve(true);
  }

  /**
   * Check if user can edit a story map
   *
   * TODO: CRITICAL - See hasMapAccess() comment above
   */
  async canEdit(userId: string, mapId: string): Promise<boolean> {
    this.validateRequired(userId, 'userId');
    this.validateRequired(mapId, 'mapId');

    // TEMPORARY: Bypass permission check until StoryMap model exists
    return Promise.resolve(true);
  }
}
