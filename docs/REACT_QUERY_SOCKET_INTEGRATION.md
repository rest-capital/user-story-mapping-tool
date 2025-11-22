# React Query + Socket.IO Integration Guide

**Context:** This is an addendum to `SOCKET_IO_IMPLEMENTATION.md` showing how to integrate Socket.IO with React Query (TanStack Query) for optimal real-time collaboration.

---

## Architecture: React Query + Socket.IO

### Separation of Concerns

```
┌─────────────────────────────────────────┐
│           React Component               │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
    ▼                   ▼
┌─────────────┐   ┌──────────────┐
│ React Query │   │  Socket.IO   │
│  (HTTP API) │   │ (WebSocket)  │
└──────┬──────┘   └──────┬───────┘
       │                 │
       ▼                 ▼
   REST API         WebSocket
   (CRUD ops)       (Real-time)
```

### Division of Responsibilities

| Concern | React Query | Socket.IO |
|---------|-------------|-----------|
| **Initial data load** | ✅ Fetch stories on mount | ❌ |
| **User's own mutations** | ✅ Optimistic updates | ✅ Emit events |
| **Other users' changes** | ✅ Cache invalidation | ✅ Receive events |
| **Pagination/Infinite scroll** | ✅ Query management | ❌ |
| **Background refetch** | ✅ Auto-refetch | ❌ |
| **Cache management** | ✅ Dedupe requests | ❌ |
| **Real-time sync** | ❌ | ✅ Live updates |

### Key Principle

**React Query is source of truth for state, Socket.IO triggers cache updates.**

---

## Pattern 1: Cache Invalidation (Simplest)

When WebSocket event arrives → Invalidate React Query cache → Auto-refetch from server.

### Pros & Cons

✅ **Pros:**
- Simple, foolproof
- Server is always source of truth
- Works for all event types

❌ **Cons:**
- Extra HTTP request on every change
- Slower than direct cache update
- More server load

### When to Use

- Complex data transformations
- Need server-computed fields
- Want guaranteed consistency

### Implementation

```typescript
// apps/frontend/src/hooks/useSocketSync.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '@/stores/useSocketStore';

export function useSocketSync(mapId: string) {
  const queryClient = useQueryClient();
  const socket = useSocketStore((state) => state.socket);

  useEffect(() => {
    if (!socket) return;

    // Story events → Invalidate stories query
    const handleStoryEvent = () => {
      queryClient.invalidateQueries({ queryKey: ['stories', mapId] });
    };

    socket.on('story.created', handleStoryEvent);
    socket.on('story.updated', handleStoryEvent);
    socket.on('story.deleted', handleStoryEvent);
    socket.on('story.moved', handleStoryEvent);

    // Release events → Invalidate releases query
    const handleReleaseEvent = () => {
      queryClient.invalidateQueries({ queryKey: ['releases', mapId] });
    };

    socket.on('release.created', handleReleaseEvent);
    socket.on('release.updated', handleReleaseEvent);
    socket.on('release.deleted', handleReleaseEvent);

    return () => {
      socket.off('story.created', handleStoryEvent);
      socket.off('story.updated', handleStoryEvent);
      socket.off('story.deleted', handleStoryEvent);
      socket.off('story.moved', handleStoryEvent);
      socket.off('release.created', handleReleaseEvent);
      socket.off('release.updated', handleReleaseEvent);
      socket.off('release.deleted', handleReleaseEvent);
    };
  }, [socket, mapId, queryClient]);
}
```

### Usage in Component

```typescript
// apps/frontend/src/pages/StoryMapPage.tsx
import { useQuery } from '@tanstack/react-query';
import { useSocketSync } from '@/hooks/useSocketSync';

export function StoryMapPage() {
  const { mapId } = useParams();

  // Fetch initial data via React Query
  const { data: stories } = useQuery({
    queryKey: ['stories', mapId],
    queryFn: () => api.getStories(mapId),
  });

  // Setup Socket.IO cache invalidation
  useSocketSync(mapId);

  // Stories will auto-refetch when WebSocket events arrive
  return <StoryMap stories={stories} />;
}
```

---

## Pattern 2: Direct Cache Updates (Faster)

When WebSocket event arrives → Update React Query cache directly → No HTTP request.

### Pros & Cons

✅ **Pros:**
- Instant UI updates
- No extra HTTP requests
- Reduced server load

❌ **Cons:**
- More complex
- Need to handle edge cases
- Cache can drift if event format changes

### When to Use

- Simple CRUD operations
- Event contains full data
- Performance is critical

### Implementation

```typescript
// apps/frontend/src/hooks/useSocketSync.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '@/stores/useSocketStore';
import type { Story } from '@/types/story';

export function useSocketSync(mapId: string) {
  const queryClient = useQueryClient();
  const socket = useSocketStore((state) => state.socket);

  useEffect(() => {
    if (!socket) return;

    // STORY CREATED - Add to cache
    const handleStoryCreated = (data: Story) => {
      queryClient.setQueryData<Story[]>(
        ['stories', mapId],
        (oldStories = []) => [...oldStories, data]
      );
    };

    // STORY UPDATED - Update in cache
    const handleStoryUpdated = (data: Partial<Story> & { id: string }) => {
      queryClient.setQueryData<Story[]>(
        ['stories', mapId],
        (oldStories = []) =>
          oldStories.map((story) =>
            story.id === data.id ? { ...story, ...data } : story
          )
      );
    };

    // STORY DELETED - Remove from cache
    const handleStoryDeleted = (data: { id: string }) => {
      queryClient.setQueryData<Story[]>(
        ['stories', mapId],
        (oldStories = []) => oldStories.filter((s) => s.id !== data.id)
      );
    };

    // STORY MOVED - Update position in cache
    const handleStoryMoved = (data: Partial<Story> & { id: string }) => {
      queryClient.setQueryData<Story[]>(
        ['stories', mapId],
        (oldStories = []) =>
          oldStories.map((story) =>
            story.id === data.id
              ? {
                  ...story,
                  stepId: data.stepId,
                  releaseId: data.releaseId,
                  sortOrder: data.sortOrder,
                }
              : story
          )
      );
    };

    socket.on('story.created', handleStoryCreated);
    socket.on('story.updated', handleStoryUpdated);
    socket.on('story.deleted', handleStoryDeleted);
    socket.on('story.moved', handleStoryMoved);

    return () => {
      socket.off('story.created', handleStoryCreated);
      socket.off('story.updated', handleStoryUpdated);
      socket.off('story.deleted', handleStoryDeleted);
      socket.off('story.moved', handleStoryMoved);
    };
  }, [socket, mapId, queryClient]);
}
```

---

## Pattern 3: Hybrid (Recommended)

**Best of both worlds:** Optimistic updates for user's actions, direct cache updates for others' actions.

### Strategy

1. **User creates story** → React Query mutation with optimistic update
2. **WebSocket confirms** → Update cache with server ID
3. **Other user creates story** → Direct cache update from WebSocket event

### Implementation

```typescript
// apps/frontend/src/hooks/useStoryMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '@/stores/useSocketStore';
import type { Story, CreateStoryDto } from '@/types/story';

export function useStoryMutations(mapId: string) {
  const queryClient = useQueryClient();
  const socket = useSocketStore((state) => state.socket);

  // CREATE STORY
  const createStory = useMutation({
    mutationFn: (data: CreateStoryDto) => api.createStory(data),

    // Optimistic update
    onMutate: async (newStory) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['stories', mapId] });

      // Snapshot previous value
      const previousStories = queryClient.getQueryData<Story[]>(['stories', mapId]);

      // Optimistically update cache
      const tempId = `temp-${Date.now()}`;
      const optimisticStory: Story = {
        id: tempId,
        ...newStory,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      queryClient.setQueryData<Story[]>(
        ['stories', mapId],
        (old = []) => [...old, optimisticStory]
      );

      // Emit WebSocket event (others will see it)
      socket?.emit('story.create', newStory);

      // Return context for rollback
      return { previousStories, tempId };
    },

    // On success, replace temp story with real one
    onSuccess: (data, variables, context) => {
      queryClient.setQueryData<Story[]>(
        ['stories', mapId],
        (old = []) =>
          old.map((story) =>
            story.id === context?.tempId ? data : story
          )
      );
    },

    // On error, rollback
    onError: (err, variables, context) => {
      if (context?.previousStories) {
        queryClient.setQueryData(['stories', mapId], context.previousStories);
      }
    },
  });

  // UPDATE STORY
  const updateStory = useMutation({
    mutationFn: ({ id, ...data }: Partial<Story> & { id: string }) =>
      api.updateStory(id, data),

    onMutate: async (updatedStory) => {
      await queryClient.cancelQueries({ queryKey: ['stories', mapId] });

      const previousStories = queryClient.getQueryData<Story[]>(['stories', mapId]);

      // Optimistic update
      queryClient.setQueryData<Story[]>(
        ['stories', mapId],
        (old = []) =>
          old.map((story) =>
            story.id === updatedStory.id
              ? { ...story, ...updatedStory }
              : story
          )
      );

      // Emit WebSocket
      socket?.emit('story.update', updatedStory);

      return { previousStories };
    },

    onError: (err, variables, context) => {
      if (context?.previousStories) {
        queryClient.setQueryData(['stories', mapId], context.previousStories);
      }
    },
  });

  // DELETE STORY
  const deleteStory = useMutation({
    mutationFn: (id: string) => api.deleteStory(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['stories', mapId] });

      const previousStories = queryClient.getQueryData<Story[]>(['stories', mapId]);

      // Optimistic delete
      queryClient.setQueryData<Story[]>(
        ['stories', mapId],
        (old = []) => old.filter((story) => story.id !== id)
      );

      // Emit WebSocket
      socket?.emit('story.delete', { id, mapId });

      return { previousStories };
    },

    onError: (err, variables, context) => {
      if (context?.previousStories) {
        queryClient.setQueryData(['stories', mapId], context.previousStories);
      }
    },
  });

  // MOVE STORY
  const moveStory = useMutation({
    mutationFn: ({
      id,
      toStepId,
      toReleaseId,
    }: {
      id: string;
      toStepId: string;
      toReleaseId: string;
    }) => api.moveStory(id, toStepId, toReleaseId),

    onMutate: async ({ id, toStepId, toReleaseId }) => {
      await queryClient.cancelQueries({ queryKey: ['stories', mapId] });

      const previousStories = queryClient.getQueryData<Story[]>(['stories', mapId]);

      // Optimistic move
      queryClient.setQueryData<Story[]>(
        ['stories', mapId],
        (old = []) =>
          old.map((story) =>
            story.id === id
              ? { ...story, stepId: toStepId, releaseId: toReleaseId }
              : story
          )
      );

      // Emit WebSocket
      socket?.emit('story.move', { id, toStepId, toReleaseId });

      return { previousStories };
    },

    onError: (err, variables, context) => {
      if (context?.previousStories) {
        queryClient.setQueryData(['stories', mapId], context.previousStories);
      }
    },
  });

  return {
    createStory,
    updateStory,
    deleteStory,
    moveStory,
  };
}
```

### WebSocket Listeners (Only for Other Users)

```typescript
// apps/frontend/src/hooks/useSocketSync.ts
export function useSocketSync(mapId: string, currentUserId: string) {
  const queryClient = useQueryClient();
  const socket = useSocketStore((state) => state.socket);

  useEffect(() => {
    if (!socket) return;

    // Handle events from OTHER users only
    const handleStoryCreated = (data: Story) => {
      // Skip if this was from the current user (already in cache via optimistic update)
      if (data.createdBy === currentUserId) return;

      queryClient.setQueryData<Story[]>(
        ['stories', mapId],
        (old = []) => [...old, data]
      );
    };

    const handleStoryUpdated = (data: Partial<Story> & { id: string }) => {
      // Skip if this was from the current user
      if (data.updatedBy === currentUserId) return;

      queryClient.setQueryData<Story[]>(
        ['stories', mapId],
        (old = []) =>
          old.map((story) =>
            story.id === data.id ? { ...story, ...data } : story
          )
      );
    };

    const handleStoryDeleted = (data: { id: string; deletedBy: string }) => {
      if (data.deletedBy === currentUserId) return;

      queryClient.setQueryData<Story[]>(
        ['stories', mapId],
        (old = []) => old.filter((s) => s.id !== data.id)
      );
    };

    socket.on('story.created', handleStoryCreated);
    socket.on('story.updated', handleStoryUpdated);
    socket.on('story.deleted', handleStoryDeleted);

    return () => {
      socket.off('story.created', handleStoryCreated);
      socket.off('story.updated', handleStoryUpdated);
      socket.off('story.deleted', handleStoryDeleted);
    };
  }, [socket, mapId, queryClient, currentUserId]);
}
```

---

## Complete Component Example

```typescript
// apps/frontend/src/pages/StoryMapPage.tsx
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useSocketStore } from '@/stores/useSocketStore';
import { useSocketSync } from '@/hooks/useSocketSync';
import { useStoryMutations } from '@/hooks/useStoryMutations';
import { useAuth } from '@/hooks/useAuth';

export function StoryMapPage() {
  const { mapId } = useParams();
  const { user, token } = useAuth();
  const { connect, disconnect, joinMap, leaveMap, isConnected } = useSocketStore();

  // 1. Setup WebSocket connection
  useEffect(() => {
    if (token) {
      connect(token);
      return () => disconnect();
    }
  }, [token]);

  // 2. Join map room
  useEffect(() => {
    if (isConnected && mapId) {
      joinMap(mapId);
      return () => leaveMap(mapId);
    }
  }, [isConnected, mapId]);

  // 3. Fetch initial data with React Query
  const { data: stories, isLoading } = useQuery({
    queryKey: ['stories', mapId],
    queryFn: () => api.getStories(mapId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: releases } = useQuery({
    queryKey: ['releases', mapId],
    queryFn: () => api.getReleases(mapId),
  });

  // 4. Setup WebSocket sync (updates from other users)
  useSocketSync(mapId, user.id);

  // 5. Get mutations (for current user actions)
  const { createStory, updateStory, deleteStory, moveStory } =
    useStoryMutations(mapId);

  // Example: Handle story creation
  const handleCreateStory = (data: CreateStoryDto) => {
    createStory.mutate(data);
  };

  // Example: Handle drag-and-drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const storyId = result.draggableId;
    const [toStepId, toReleaseId] = result.destination.droppableId.split(':');

    moveStory.mutate({ id: storyId, toStepId, toReleaseId });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      {!isConnected && <ConnectionBanner />}

      <StoryMap
        stories={stories}
        releases={releases}
        onCreateStory={handleCreateStory}
        onUpdateStory={(id, data) => updateStory.mutate({ id, ...data })}
        onDeleteStory={(id) => deleteStory.mutate(id)}
        onDragEnd={handleDragEnd}
      />
    </div>
  );
}
```

---

## Advanced Patterns

### Pattern 4: Subscription Queries

For data that's always real-time (like comments):

```typescript
// apps/frontend/src/hooks/useStoryComments.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '@/stores/useSocketStore';
import { useEffect } from 'react';

export function useStoryComments(storyId: string) {
  const queryClient = useQueryClient();
  const socket = useSocketStore((state) => state.socket);

  // Initial fetch
  const query = useQuery({
    queryKey: ['comments', storyId],
    queryFn: () => api.getComments(storyId),
    refetchInterval: false, // Don't refetch, rely on WebSocket
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleCommentCreated = (comment: Comment) => {
      if (comment.storyId !== storyId) return;

      queryClient.setQueryData<Comment[]>(
        ['comments', storyId],
        (old = []) => [...old, comment]
      );
    };

    const handleCommentDeleted = (data: { id: string; storyId: string }) => {
      if (data.storyId !== storyId) return;

      queryClient.setQueryData<Comment[]>(
        ['comments', storyId],
        (old = []) => old.filter((c) => c.id !== data.id)
      );
    };

    socket.on('comment.created', handleCommentCreated);
    socket.on('comment.deleted', handleCommentDeleted);

    return () => {
      socket.off('comment.created', handleCommentCreated);
      socket.off('comment.deleted', handleCommentDeleted);
    };
  }, [socket, storyId, queryClient]);

  return query;
}
```

### Pattern 5: Background Sync on Reconnect

Sync missed changes when user reconnects:

```typescript
// apps/frontend/src/hooks/useReconnectSync.ts
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '@/stores/useSocketStore';

export function useReconnectSync(mapId: string) {
  const queryClient = useQueryClient();
  const socket = useSocketStore((state) => state.socket);
  const lastSyncTime = useRef<Date>(new Date());

  useEffect(() => {
    if (!socket) return;

    const handleReconnect = () => {
      console.log('Reconnected! Syncing changes...');

      // Request all changes since last sync
      socket.emit('map.sync', {
        mapId,
        lastSyncTimestamp: lastSyncTime.current,
      });
    };

    const handleSyncResponse = (data: {
      stories: Story[];
      releases: Release[];
      steps: Step[];
      serverTimestamp: Date;
    }) => {
      // Update cache with all changes
      if (data.stories.length > 0) {
        queryClient.setQueryData<Story[]>(
          ['stories', mapId],
          (old = []) => {
            const updated = [...old];
            data.stories.forEach((newStory) => {
              const index = updated.findIndex((s) => s.id === newStory.id);
              if (index >= 0) {
                updated[index] = newStory;
              } else {
                updated.push(newStory);
              }
            });
            return updated;
          }
        );
      }

      // Update last sync time
      lastSyncTime.current = new Date(data.serverTimestamp);

      console.log(`Synced ${data.stories.length} changes`);
    };

    socket.on('connect', handleReconnect);
    socket.on('map.synced', handleSyncResponse);

    return () => {
      socket.off('connect', handleReconnect);
      socket.off('map.synced', handleSyncResponse);
    };
  }, [socket, mapId, queryClient]);
}
```

---

## Best Practices

### 1. **Always Cancel In-Flight Queries on Optimistic Updates**

```typescript
onMutate: async (newData) => {
  // ✅ CRITICAL: Cancel any in-flight fetches
  await queryClient.cancelQueries({ queryKey: ['stories', mapId] });

  // ... rest of optimistic update
}
```

### 2. **Return Context for Rollback**

```typescript
onMutate: async (newData) => {
  const previousData = queryClient.getQueryData(['stories', mapId]);

  // ... optimistic update

  // ✅ Return context
  return { previousData };
},

onError: (err, variables, context) => {
  // ✅ Rollback on error
  if (context?.previousData) {
    queryClient.setQueryData(['stories', mapId], context.previousData);
  }
}
```

### 3. **Deduplicate Events from Current User**

```typescript
const handleStoryUpdated = (data: Story) => {
  // ✅ Skip events from current user (already in cache)
  if (data.updatedBy === currentUserId) return;

  // Update cache
};
```

### 4. **Use Query Keys Consistently**

```typescript
// ✅ GOOD: Hierarchical query keys
['stories', mapId]
['comments', storyId]
['releases', mapId]

// ❌ BAD: Flat query keys
['allStories']
['storyComments']
```

### 5. **Invalidate Related Queries**

```typescript
// When story moves, invalidate both old and new cells
socket.on('story.moved', (data) => {
  queryClient.invalidateQueries({ queryKey: ['stories', mapId] });
  queryClient.invalidateQueries({ queryKey: ['releases', mapId] }); // Update counts
});
```

---

## Performance Optimization

### 1. **Throttle Frequent Updates**

```typescript
import { debounce } from 'lodash';

// Debounce title updates (don't spam server on every keystroke)
const debouncedUpdateTitle = useMemo(
  () =>
    debounce((storyId: string, title: string) => {
      updateStory.mutate({ id: storyId, title });
    }, 500),
  [updateStory]
);
```

### 2. **Batch Updates**

```typescript
// apps/frontend/src/hooks/useStoryMutations.ts
const reorderStories = useMutation({
  mutationFn: (updates: Array<{ id: string; sortOrder: number }>) =>
    api.batchUpdateStories(updates),

  onMutate: async (updates) => {
    await queryClient.cancelQueries({ queryKey: ['stories', mapId] });

    const previousStories = queryClient.getQueryData<Story[]>(['stories', mapId]);

    // Optimistic batch update
    queryClient.setQueryData<Story[]>(
      ['stories', mapId],
      (old = []) =>
        old.map((story) => {
          const update = updates.find((u) => u.id === story.id);
          return update ? { ...story, sortOrder: update.sortOrder } : story;
        })
    );

    // Emit single WebSocket event
    socket?.emit('stories.reorder', { mapId, updates });

    return { previousStories };
  },
});
```

### 3. **Selective Re-renders**

```typescript
// Only subscribe to stories in current view
const { data: stories } = useQuery({
  queryKey: ['stories', mapId, currentStepId, currentReleaseId],
  queryFn: () => api.getStoriesByCell(mapId, currentStepId, currentReleaseId),
  select: (data) => data.filter((s) => s.stepId === currentStepId),
});
```

---

## Debugging Tips

### 1. **React Query DevTools**

```typescript
// apps/frontend/src/App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

### 2. **Log WebSocket Events**

```typescript
// apps/frontend/src/hooks/useSocketSync.ts
useEffect(() => {
  if (!socket) return;

  const logEvent = (eventName: string) => (data: any) => {
    console.log(`[WS] ${eventName}:`, data);
  };

  socket.onAny(logEvent('*'));

  return () => {
    socket.offAny(logEvent('*'));
  };
}, [socket]);
```

### 3. **Query Cache Inspector**

```typescript
// Check cache state
const stories = queryClient.getQueryData(['stories', mapId]);
console.log('Current cache:', stories);

// Check all queries
console.log('All queries:', queryClient.getQueryCache().getAll());
```

---

## Migration Checklist

If you're adding this to existing code:

- [ ] Install React Query devtools
- [ ] Create `useSocketSync` hook
- [ ] Create `useStoryMutations` hook
- [ ] Update components to use mutations instead of direct API calls
- [ ] Add optimistic updates to mutations
- [ ] Test optimistic update rollback on errors
- [ ] Add WebSocket event listeners
- [ ] Test concurrent editing (open 2 browser tabs)
- [ ] Add reconnection sync logic
- [ ] Add loading/error states
- [ ] Add connection status indicator

---

## Summary

**Recommended Architecture:**

1. **React Query** for all HTTP requests and cache management
2. **Socket.IO** for real-time event broadcasting
3. **Optimistic updates** for user's own actions (via React Query mutations)
4. **Direct cache updates** for other users' actions (via WebSocket listeners)
5. **Rollback on error** for failed optimistic updates
6. **Background sync** on reconnection

**Key Benefits:**
- ✅ Instant UI updates (optimistic)
- ✅ Automatic cache management (React Query)
- ✅ Real-time collaboration (Socket.IO)
- ✅ Offline-friendly (mutations queue)
- ✅ Type-safe (TypeScript)
- ✅ Testable (mocked mutations)

**Next Steps:**
1. Implement `useSocketSync` hook
2. Convert API calls to React Query mutations
3. Add optimistic updates
4. Test with multiple users
5. Add error handling and rollback
6. Monitor performance with devtools
