/**
 * Comment entity interface
 * Represents database structure (matches Prisma model)
 */
export interface CommentEntity {
  id: string;
  storyId: string | null;
  releaseId: string | null;
  authorId: string;
  author: string;
  avatarUrl: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
