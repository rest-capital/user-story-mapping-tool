/**
 * Journey entity representing the database schema
 * Based on Prisma schema definition
 */
export interface JourneyEntity {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string | null;
}
