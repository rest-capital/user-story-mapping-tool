/**
 * Response types for WebSocket comment events
 * Ensures type safety and consistency
 */

export interface CommentCreatedResponse {
  id: string;
  story_id: string | null;
  content: string;
  author: string;
  author_id: string;
  avatar_url: string | null;
  created_at: Date;
}

export interface CommentDeletedResponse {
  id: string;
  story_id: string | null;
}
