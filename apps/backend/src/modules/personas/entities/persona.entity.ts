/**
 * Persona Entity Interface
 * Maps to Prisma Persona model (camelCase fields)
 */
export interface PersonaEntity {
  id: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  createdAt: Date;
}
