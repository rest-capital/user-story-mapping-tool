/**
 * Response types for WebSocket story events
 * Ensures type safety and consistency
 */

export interface StoryCreatedResponse {
  id: string;
  step_id: string;
  release_id: string;
  title: string;
  description: string;
  status: string;
  size: number | null;
  sort_order: number;
  created_at: Date;
  created_by: string;
}

export interface StoryUpdatedResponse {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  size?: number | null;
  updated_at: Date;
  updated_by: string | null;
}

export interface StoryMovedResponse {
  id: string;
  step_id: string;
  release_id: string;
  sort_order: number;
  updated_at: Date;
  updated_by: string | null;
}

export interface StoryDeletedResponse {
  id: string;
  deleted_by: string;
  deleted_at: Date;
}
