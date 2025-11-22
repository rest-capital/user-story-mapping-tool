export interface StoryMapEntity {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string | null;
}
