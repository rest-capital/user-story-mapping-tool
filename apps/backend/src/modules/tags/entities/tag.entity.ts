/**
 * Tag Entity Interface
 * Maps to Prisma Tag model (camelCase fields)
 */
export interface TagEntity {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}
