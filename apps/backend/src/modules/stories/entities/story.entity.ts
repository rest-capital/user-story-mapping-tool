import { StoryStatus } from '../dto/create-story.dto';

/**
 * Story Entity Interface
 * Maps to Prisma Story model (camelCase fields)
 */
export interface StoryEntity {
  id: string;
  stepId: string;
  releaseId: string;
  title: string;
  description: string;
  status: StoryStatus;
  size: number | null;
  sortOrder: number;
  labelId: string | null;
  labelName: string;
  labelColor: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string | null;
}
