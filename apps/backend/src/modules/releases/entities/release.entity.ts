/**
 * Release Entity
 * Represents the database schema for Release (Prisma type)
 */
export interface ReleaseEntity {
  id: string;
  name: string;
  description: string;
  startDate: Date | null;
  dueDate: Date | null;
  shipped: boolean;
  isUnassigned: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string | null;
}
