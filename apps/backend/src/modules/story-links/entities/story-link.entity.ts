export interface StoryLinkEntity {
  id: string;
  sourceStoryId: string;
  targetStoryId: string;
  linkType: string;
  createdAt: Date;
}
