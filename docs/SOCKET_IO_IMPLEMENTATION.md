# Socket.IO Real-Time Collaboration Implementation Guide

**Project:** User Story Mapping Tool
**Backend:** NestJS + TypeScript + Prisma + Supabase Auth
**Frontend:** React + Zustand + React Query
**Max Users per Map:** 5 concurrent users

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Conflict Resolution Strategy](#conflict-resolution-strategy)
3. [Authentication & Security](#authentication--security)
4. [Event Design Patterns](#event-design-patterns)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Integration](#frontend-integration)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Considerations](#deployment-considerations)

**📘 React Query Integration:** See [`REACT_QUERY_SOCKET_INTEGRATION.md`](./REACT_QUERY_SOCKET_INTEGRATION.md) for complete React Query + Socket.IO patterns.

---

## Architecture Overview

### Why Socket.IO Over SockJS?

**Decision:** Use Socket.IO (not SockJS like Avion.io)

**Rationale:**
- ✅ Active development (SockJS stalled since 2020)
- ✅ **Rooms feature** - Perfect for map-based isolation
- ✅ Auto-reconnection built-in
- ✅ First-class NestJS support (`@nestjs/websockets`)
- ✅ Better documentation and community
- ✅ Namespace support for future scaling

### High-Level Flow

```
┌─────────────┐
│   Client    │
│  (React)    │
└──────┬──────┘
       │ WebSocket + JWT
       │
       ▼
┌─────────────────────────────────┐
│  Socket.IO Gateway (NestJS)     │
│  - Authenticate via JWT         │
│  - Join map room                │
│  - Validate permissions         │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Service Layer                  │
│  - Business logic               │
│  - Prisma database operations   │
│  - Broadcast to room            │
└─────────────────────────────────┘
```

### Room Structure

Each story map gets its own Socket.IO room:

```typescript
Room: `map:${mapId}`
  └─ Connected users (max 5)
     ├─ User 1 (Editor role)
     ├─ User 2 (Viewer role)
     └─ User 3 (Admin role)
```

---

## Conflict Resolution Strategy

### Recommended: **Last-Write-Wins (LWW)** with Optimistic UI

**Why not OT or CRDT?**
- **Operational Transformation (OT)**: Complex, designed for text editing (Google Docs)
- **CRDT**: Overkill for structured data with only 5 concurrent users
- **Last-Write-Wins**: Simple, reliable, works great for small teams

### How It Works

1. **Client makes change** → Update local state immediately (optimistic)
2. **Send event to server** → Include timestamp
3. **Server validates & persists** → Last update wins
4. **Server broadcasts to room** → All clients sync
5. **Handle conflicts** → Server's version is source of truth

### Conflict Scenarios & Solutions

| Scenario | Solution |
|----------|----------|
| **Two users move same story simultaneously** | Last write wins, both see final position |
| **User A edits title while User B deletes story** | Deletion wins (more destructive action) |
| **User offline, reconnects with stale data** | Server sends full state on reconnect |
| **Network delay causes out-of-order updates** | Use `updated_at` timestamp to reject stale updates |

### Implementation Pattern

```typescript
// Client sends
{
  event: 'story.update',
  data: {
    id: 'story-123',
    title: 'New title',
    clientTimestamp: Date.now(),
    userId: 'user-456'
  }
}

// Server validates
- Check user has edit permission
- Check story exists
- Update database with new updated_at
- Broadcast to room (excluding sender)

// All clients receive
{
  event: 'story.updated',
  data: {
    id: 'story-123',
    title: 'New title',
    updated_at: '2025-11-22T...',
    updated_by: 'user-456'
  }
}
```

**Key Principle:** Server is source of truth. Clients show optimistic updates but reconcile with server.

---

## Authentication & Security

### Industry Standard: JWT in Handshake

**Best Practice (2024):** Authenticate during WebSocket handshake, trust subsequent messages.

**Why?**
- ✅ Validates user before any events
- ✅ Disconnects unauthorized users immediately
- ✅ Avoids re-validating every message (performance)
- ✅ Works with short-lived JWTs (connection lifecycle < token expiry)

### Token Transmission

**Recommended:** Pass JWT in `auth` object

```typescript
// Frontend
const socket = io('http://localhost:3000', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
});
```

**Why not query string?** HTTP servers log URLs → JWT leaks in logs ⚠️

### Implementation

#### Step 1: JWT Middleware

```typescript
// apps/backend/src/common/middleware/ws-jwt.middleware.ts
import { Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';

export type SocketWithAuth = Socket & {
  user: {
    id: string;
    email: string;
    role: string;
  };
};

export const WsJwtMiddleware = () => {
  return async (socket: SocketWithAuth, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      // Verify JWT with Supabase public key
      const decoded = verify(token, process.env.SUPABASE_JWT_SECRET) as {
        sub: string;
        email: string;
        role?: string;
      };

      // Attach user to socket
      socket.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role || 'viewer',
      };

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  };
};
```

#### Step 2: Apply Middleware in Gateway

```typescript
// apps/backend/src/modules/story-maps/story-maps.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { WsJwtMiddleware, SocketWithAuth } from '@/common/middleware/ws-jwt.middleware';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
export class StoryMapsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    // Apply JWT middleware to all connections
    server.use(WsJwtMiddleware());
  }

  handleConnection(socket: SocketWithAuth) {
    console.log(`Client connected: ${socket.id}, User: ${socket.user.email}`);
  }

  handleDisconnect(socket: SocketWithAuth) {
    console.log(`Client disconnected: ${socket.id}`);
  }
}
```

### Role-Based Permissions

Check permissions before executing actions:

```typescript
@SubscribeMessage('story.update')
async handleStoryUpdate(
  @ConnectedSocket() socket: SocketWithAuth,
  @MessageBody() data: UpdateStorySocketDto & { mapId: string },
) {
  // Check if user has edit permission for this map
  const hasPermission = await this.storyMapsService.canEdit(
    socket.user.id,
    data.mapId,
  );

  if (!hasPermission) {
    socket.emit('error', { message: 'Insufficient permissions' });
    return;
  }

  // Proceed with update...
}
```

---

## Event Design Patterns

### Event Granularity: **Coarse-Grained with Delta Updates**

**Principle:** Send minimal data needed to sync, not entire objects.

### Event Naming Convention

```
<entity>.<action>     // Client → Server (request)
<entity>.<action>ed   // Server → Clients (broadcast)
```

Examples:
- `story.create` → `story.created`
- `story.update` → `story.updated`
- `story.delete` → `story.deleted`
- `story.move` → `story.moved`

### Real-Time Events Specification

#### 1. **Story CRUD Events**

```typescript
// ===== CREATE =====
// Client → Server
{
  event: 'story.create',
  data: {
    mapId: string;
    stepId: string;
    releaseId: string;
    title: string;
    description?: string;
  }
}

// Server → Clients
{
  event: 'story.created',
  data: {
    id: string;
    stepId: string;
    releaseId: string;
    title: string;
    description: string;
    sortOrder: number;
    status: string;
    createdAt: Date;
    createdBy: string; // userId
  }
}

// ===== UPDATE =====
// Client → Server
{
  event: 'story.update',
  data: {
    id: string;
    mapId: string;
    title?: string;
    description?: string;
    status?: string;
    size?: number;
  }
}

// Server → Clients
{
  event: 'story.updated',
  data: {
    id: string;
    // Only changed fields + metadata
    ...changes,
    updatedAt: Date;
    updatedBy: string;
  }
}

// ===== MOVE (Between Cells) =====
// Client → Server
{
  event: 'story.move',
  data: {
    id: string;
    mapId: string;
    fromStepId: string;
    fromReleaseId: string;
    toStepId: string;
    toReleaseId: string;
    newSortOrder: number;
  }
}

// Server → Clients
{
  event: 'story.moved',
  data: {
    id: string;
    stepId: string;      // new position
    releaseId: string;   // new position
    sortOrder: number;
    updatedAt: Date;
    updatedBy: string;
  }
}

// ===== DELETE =====
// Client → Server
{
  event: 'story.delete',
  data: {
    id: string;
    mapId: string;
  }
}

// Server → Clients
{
  event: 'story.deleted',
  data: {
    id: string;
    deletedBy: string;
    deletedAt: Date;
  }
}
```

#### 2. **Comment Events**

```typescript
// CREATE COMMENT
// Client → Server
{
  event: 'comment.create',
  data: {
    storyId: string;
    mapId: string;
    content: string;
  }
}

// Server → Clients
{
  event: 'comment.created',
  data: {
    id: string;
    storyId: string;
    content: string;
    author: string;      // User name
    authorId: string;
    avatarUrl: string;
    createdAt: Date;
  }
}

// DELETE COMMENT
// Client → Server
{
  event: 'comment.delete',
  data: {
    id: string;
    storyId: string;
    mapId: string;
  }
}

// Server → Clients
{
  event: 'comment.deleted',
  data: {
    id: string;
    storyId: string;
  }
}
```

#### 3. **Drag & Drop Events**

For smooth drag-and-drop with real-time sync:

```typescript
// DRAG START (optional, for presence)
// Client → Server
{
  event: 'story.drag.start',
  data: {
    storyId: string;
    mapId: string;
  }
}

// Server → Other Clients
{
  event: 'story.dragging',
  data: {
    storyId: string;
    userId: string;
    userName: string;
  }
}

// DRAG END = story.move event (see above)
```

**Throttling:** Throttle drag position updates to max 100ms to avoid flooding.

#### 4. **Release/Step Management Events**

```typescript
// CREATE RELEASE
{
  event: 'release.create',
  data: {
    mapId: string;
    name: string;
    description?: string;
  }
}

{
  event: 'release.created',
  data: {
    id: string;
    name: string;
    description: string;
    sortOrder: number;
    createdAt: Date;
  }
}

// Similar patterns for:
// - release.update / release.updated
// - release.delete / release.deleted (moves stories to Unassigned)
// - step.create / step.created
// - step.update / step.updated
// - step.delete / step.deleted (moves stories to Unassigned)
```

#### 5. **Reorder Events** (Drag to reorder)

```typescript
// REORDER RELEASES
{
  event: 'releases.reorder',
  data: {
    mapId: string;
    releaseIds: string[]; // New order
  }
}

{
  event: 'releases.reordered',
  data: {
    updates: Array<{
      id: string;
      sortOrder: number;
    }>;
  }
}

// Same pattern for steps.reorder
```

### Connection Lifecycle Events

```typescript
// JOIN MAP ROOM
// Client → Server (on page load)
{
  event: 'map.join',
  data: {
    mapId: string;
  }
}

// Server → Client (confirmation)
{
  event: 'map.joined',
  data: {
    mapId: string;
    connectedUsers: Array<{
      id: string;
      name: string;
      role: string;
    }>;
  }
}

// LEAVE MAP ROOM
// Client → Server (on page unload)
{
  event: 'map.leave',
  data: {
    mapId: string;
  }
}

// SYNC STATE (on reconnect)
// Client → Server
{
  event: 'map.sync',
  data: {
    mapId: string;
    lastSyncTimestamp: Date; // Client's last known state
  }
}

// Server → Client
{
  event: 'map.synced',
  data: {
    stories: Story[];        // All stories changed since lastSync
    releases: Release[];
    steps: Step[];
    serverTimestamp: Date;
  }
}
```

### Error Handling

```typescript
// Server → Client (on any error)
{
  event: 'error',
  data: {
    message: string;
    code: string;         // 'PERMISSION_DENIED', 'NOT_FOUND', etc.
    context?: any;        // Original request data
  }
}
```

---

## Backend Implementation

### Module Structure

```
apps/backend/src/modules/story-maps/
├── story-maps.module.ts           # Module definition
├── story-maps.gateway.ts          # Socket.IO gateway
├── story-maps.service.ts          # Business logic
├── story-maps.controller.ts       # HTTP REST endpoints
├── dto/
│   ├── socket/                    # WebSocket DTOs
│   │   ├── story-create.dto.ts
│   │   ├── story-update.dto.ts
│   │   ├── story-move.dto.ts
│   │   └── comment-create.dto.ts
│   └── http/                      # REST API DTOs (existing)
│       └── ...
└── guards/
    └── ws-permissions.guard.ts    # WebSocket permission guard
```

### Installation

```bash
cd apps/backend
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
pnpm add -D @types/socket.io
```

### Gateway Implementation

```typescript
// apps/backend/src/modules/story-maps/story-maps.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WsJwtMiddleware, SocketWithAuth } from '@/common/middleware/ws-jwt.middleware';
import { StoryMapsService } from './story-maps.service';
import {
  CreateStorySocketDto,
  UpdateStorySocketDto,
  MoveStorySocketDto,
} from './dto/socket';

@WebSocketGateway({
  namespace: '/story-maps', // Optional: namespace for organization
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class StoryMapsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('StoryMapsGateway');

  constructor(private readonly storyMapsService: StoryMapsService) {}

  afterInit(server: Server) {
    server.use(WsJwtMiddleware());
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(socket: SocketWithAuth) {
    this.logger.log(`Client connected: ${socket.id} (User: ${socket.user.email})`);
  }

  handleDisconnect(socket: SocketWithAuth) {
    this.logger.log(`Client disconnected: ${socket.id}`);
    // Socket.IO automatically removes socket from all rooms
    // Notify others if needed (rooms are already tracked)
  }

  // ==================== MAP ROOM MANAGEMENT ====================

  @SubscribeMessage('map.join')
  async handleJoinMap(
    @ConnectedSocket() socket: SocketWithAuth,
    @MessageBody() data: { mapId: string },
  ) {
    const { mapId } = data;

    // Validate user has access to this map
    const hasAccess = await this.storyMapsService.hasMapAccess(
      socket.user.id,
      mapId,
    );

    if (!hasAccess) {
      socket.emit('error', {
        message: 'Access denied to this map',
        code: 'ACCESS_DENIED',
      });
      return;
    }

    // Join the room
    socket.join(`map:${mapId}`);

    // Get connected users
    const connectedUsers = await this.getConnectedUsers(mapId);

    // Notify user they joined
    socket.emit('map.joined', {
      mapId,
      connectedUsers,
    });

    // Notify others in the room
    socket.to(`map:${mapId}`).emit('user.joined', {
      userId: socket.user.id,
      userName: socket.user.email, // Replace with actual name from DB
    });

    this.logger.log(`User ${socket.user.id} joined map ${mapId}`);
  }

  @SubscribeMessage('map.leave')
  handleLeaveMap(
    @ConnectedSocket() socket: SocketWithAuth,
    @MessageBody() data: { mapId: string },
  ) {
    socket.leave(`map:${data.mapId}`);

    // Notify others
    socket.to(`map:${data.mapId}`).emit('user.left', {
      userId: socket.user.id,
    });
  }

  @SubscribeMessage('map.sync')
  async handleSyncMap(
    @ConnectedSocket() socket: SocketWithAuth,
    @MessageBody() data: { mapId: string; lastSyncTimestamp: Date },
  ) {
    // Fetch all changes since lastSyncTimestamp
    const changes = await this.storyMapsService.getChangesSince(
      data.mapId,
      new Date(data.lastSyncTimestamp),
    );

    socket.emit('map.synced', {
      ...changes,
      serverTimestamp: new Date(),
    });
  }

  // ==================== STORY EVENTS ====================

  @SubscribeMessage('story.create')
  async handleCreateStory(
    @ConnectedSocket() socket: SocketWithAuth,
    @MessageBody() data: CreateStorySocketDto,
  ) {
    try {
      // Validate permissions
      const canEdit = await this.storyMapsService.canEdit(
        socket.user.id,
        data.mapId,
      );

      if (!canEdit) {
        socket.emit('error', {
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
        });
        return;
      }

      // Create story
      const story = await this.storyMapsService.createStory(
        data,
        socket.user.id,
      );

      // Broadcast to all users in the map (including sender)
      this.server.to(`map:${data.mapId}`).emit('story.created', {
        id: story.id,
        stepId: story.stepId,
        releaseId: story.releaseId,
        title: story.title,
        description: story.description,
        sortOrder: story.sortOrder,
        status: story.status,
        createdAt: story.createdAt,
        createdBy: socket.user.id,
      });

      this.logger.log(`Story created: ${story.id} by ${socket.user.id}`);
    } catch (error) {
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to create story',
        code: 'CREATE_FAILED',
      });
    }
  }

  @SubscribeMessage('story.update')
  async handleUpdateStory(
    @ConnectedSocket() socket: SocketWithAuth,
    @MessageBody() data: UpdateStorySocketDto & { mapId: string },
  ) {
    try {
      // Validate permissions
      const canEdit = await this.storyMapsService.canEdit(
        socket.user.id,
        data.mapId,
      );

      if (!canEdit) {
        socket.emit('error', {
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
        });
        return;
      }

      const story = await this.storyMapsService.updateStory(
        data.id,
        data,
        socket.user.id,
      );

      // Broadcast only to others (sender already has optimistic update)
      socket.to(`map:${data.mapId}`).emit('story.updated', {
        id: story.id,
        ...data, // Only send changed fields
        updatedAt: story.updatedAt,
        updatedBy: socket.user.id,
      });
    } catch (error) {
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to update story',
        code: 'UPDATE_FAILED',
      });
    }
  }

  @SubscribeMessage('story.move')
  async handleMoveStory(
    @ConnectedSocket() socket: SocketWithAuth,
    @MessageBody() data: MoveStorySocketDto & { mapId: string },
  ) {
    try {
      // Validate permissions
      const canEdit = await this.storyMapsService.canEdit(
        socket.user.id,
        data.mapId,
      );

      if (!canEdit) {
        socket.emit('error', {
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
        });
        return;
      }

      const story = await this.storyMapsService.moveStory(
        data.id,
        data.toStepId,
        data.toReleaseId,
        socket.user.id,
      );

      socket.to(`map:${data.mapId}`).emit('story.moved', {
        id: story.id,
        stepId: story.stepId,
        releaseId: story.releaseId,
        sortOrder: story.sortOrder,
        updatedAt: story.updatedAt,
        updatedBy: socket.user.id,
      });
    } catch (error) {
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to move story',
        code: 'MOVE_FAILED',
      });
    }
  }

  @SubscribeMessage('story.delete')
  async handleDeleteStory(
    @ConnectedSocket() socket: SocketWithAuth,
    @MessageBody() data: { id: string; mapId: string },
  ) {
    try {
      // Validate permissions
      const canEdit = await this.storyMapsService.canEdit(
        socket.user.id,
        data.mapId,
      );

      if (!canEdit) {
        socket.emit('error', {
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
        });
        return;
      }

      await this.storyMapsService.deleteStory(data.id, socket.user.id);

      this.server.to(`map:${data.mapId}`).emit('story.deleted', {
        id: data.id,
        deletedBy: socket.user.id,
        deletedAt: new Date(),
      });
    } catch (error) {
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Failed to delete story',
        code: 'DELETE_FAILED',
      });
    }
  }

  // ==================== HELPER METHODS ====================

  private async getConnectedUsers(mapId: string) {
    const socketsInRoom = await this.server.in(`map:${mapId}`).fetchSockets();

    return socketsInRoom.map((socket: SocketWithAuth) => ({
      id: socket.user.id,
      name: socket.user.email, // Replace with actual user name
      role: socket.user.role,
    }));
  }
}
```

### Service Layer

Extend existing `StoryMapsService` with real-time methods:

```typescript
// apps/backend/src/modules/story-maps/story-maps.service.ts (additions)

async hasMapAccess(userId: string, mapId: string): Promise<boolean> {
  const map = await this.prisma.storyMap.findFirst({
    where: {
      id: mapId,
      OR: [
        { createdBy: userId },
        { collaborators: { some: { userId: userId } } },
      ],
    },
  });
  return !!map;
}

async canEdit(userId: string, mapId: string): Promise<boolean> {
  const map = await this.prisma.storyMap.findFirst({
    where: {
      id: mapId,
      OR: [
        { createdBy: userId },
        {
          collaborators: {
            some: {
              userId: userId,
              role: { in: ['editor', 'admin'] }
            }
          }
        },
      ],
    },
  });
  return !!map;
}

async getChangesSince(mapId: string, since: Date) {
  return {
    stories: await this.prisma.story.findMany({
      where: {
        mapId: mapId,
        updatedAt: { gt: since },
      },
    }),
    releases: await this.prisma.release.findMany({
      where: {
        mapId: mapId,
        updatedAt: { gt: since },
      },
    }),
    steps: await this.prisma.step.findMany({
      where: {
        mapId: mapId,
        updatedAt: { gt: since },
      },
    }),
  };
}
```

### DTOs

```typescript
// apps/backend/src/modules/story-maps/dto/socket/story-create.dto.ts
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateStorySocketDto {
  @IsUUID()
  mapId: string;

  @IsUUID()
  stepId: string;

  @IsUUID()
  releaseId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}

// apps/backend/src/modules/story-maps/dto/socket/story-update.dto.ts
import { IsString, IsOptional, IsUUID, IsNumber, IsEnum } from 'class-validator';

export class UpdateStorySocketDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['NOT_READY', 'READY', 'IN_PROGRESS', 'DONE'])
  status?: string;

  @IsOptional()
  @IsNumber()
  size?: number;
}

// apps/backend/src/modules/story-maps/dto/socket/story-move.dto.ts
import { IsUUID, IsNumber, IsOptional } from 'class-validator';

export class MoveStorySocketDto {
  @IsUUID()
  id: string;

  @IsOptional()
  @IsUUID()
  fromStepId?: string;

  @IsOptional()
  @IsUUID()
  fromReleaseId?: string;

  @IsUUID()
  toStepId: string;

  @IsUUID()
  toReleaseId: string;

  @IsOptional()
  @IsNumber()
  newSortOrder?: number;
}
```

---

## Frontend Integration

### Installation

```bash
cd apps/frontend
pnpm add socket.io-client
```

### Zustand Store for WebSocket

```typescript
// apps/frontend/src/stores/useSocketStore.ts
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface SocketStore {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;

  connect: (token: string) => void;
  disconnect: () => void;
  joinMap: (mapId: string) => void;
  leaveMap: (mapId: string) => void;
}

export const useSocketStore = create<SocketStore>((set, get) => ({
  socket: null,
  isConnected: false,
  connectionError: null,

  connect: (token: string) => {
    // Disconnect existing socket if any
    const existingSocket = get().socket;
    if (existingSocket) {
      existingSocket.disconnect();
    }

    const socket = io(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/story-maps`,
      {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      }
    );

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      set({ isConnected: true, connectionError: null });
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      set({ connectionError: error.message });
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      // Show toast notification
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    socket?.disconnect();
    set({ socket: null, isConnected: false });
  },

  joinMap: (mapId: string) => {
    const { socket } = get();
    socket?.emit('map.join', { mapId });
  },

  leaveMap: (mapId: string) => {
    const { socket } = get();
    socket?.emit('map.leave', { mapId });
  },
}));
```

### Story Map Store with Real-Time Sync

```typescript
// apps/frontend/src/stores/useStoryMapStore.ts
import { create } from 'zustand';
import { useSocketStore } from './useSocketStore';

interface Story {
  id: string;
  stepId: string;
  releaseId: string;
  title: string;
  description: string;
  status: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

interface StoryMapStore {
  stories: Story[];

  // Optimistic updates
  createStory: (data: Partial<Story>) => void;
  updateStory: (id: string, data: Partial<Story>, mapId: string) => void;
  deleteStory: (id: string, mapId: string) => void;
  moveStory: (id: string, toStepId: string, toReleaseId: string, mapId: string) => void;

  // Real-time sync handlers
  handleStoryCreated: (data: Story) => void;
  handleStoryUpdated: (data: Partial<Story>) => void;
  handleStoryDeleted: (data: { id: string }) => void;
  handleStoryMoved: (data: Partial<Story>) => void;

  // Setup listeners
  setupSocketListeners: () => void;
  cleanupSocketListeners: () => void;
}

export const useStoryMapStore = create<StoryMapStore>((set, get) => ({
  stories: [],

  // Optimistic create
  createStory: (data) => {
    const socket = useSocketStore.getState().socket;

    // Add to local state immediately with defaults
    const tempId = `temp-${Date.now()}`;
    const newStory: Story = {
      id: tempId,
      stepId: data.stepId || '',
      releaseId: data.releaseId || '',
      title: data.title || '',
      description: data.description || '',
      status: data.status || 'NOT_READY',
      sortOrder: data.sortOrder || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };

    set((state) => ({
      stories: [...state.stories, newStory],
    }));

    // Send to server
    socket?.emit('story.create', data);
  },

  // Optimistic update
  updateStory: (id, data, mapId) => {
    const socket = useSocketStore.getState().socket;

    // Update local state immediately
    set((state) => ({
      stories: state.stories.map((s) =>
        s.id === id ? { ...s, ...data } : s
      ),
    }));

    // Send to server
    socket?.emit('story.update', { id, ...data, mapId });
  },

  // Optimistic delete
  deleteStory: (id, mapId) => {
    const socket = useSocketStore.getState().socket;

    // Remove from local state
    set((state) => ({
      stories: state.stories.filter((s) => s.id !== id),
    }));

    // Send to server
    socket?.emit('story.delete', { id, mapId });
  },

  // Optimistic move
  moveStory: (id, toStepId, toReleaseId, mapId) => {
    const socket = useSocketStore.getState().socket;

    // Update position locally
    set((state) => ({
      stories: state.stories.map((s) =>
        s.id === id
          ? { ...s, stepId: toStepId, releaseId: toReleaseId }
          : s
      ),
    }));

    // Send to server
    socket?.emit('story.move', { id, toStepId, toReleaseId, mapId });
  },

  // Handle server confirmation
  handleStoryCreated: (data) => {
    set((state) => {
      // Replace temp story with real one (match by stepId, releaseId, title), or add if from another user
      const existingIndex = state.stories.findIndex(
        (s) => s.id.startsWith('temp-') &&
               s.stepId === data.stepId &&
               s.releaseId === data.releaseId &&
               s.title === data.title
      );

      if (existingIndex >= 0) {
        // Replace temp with real
        const newStories = [...state.stories];
        newStories[existingIndex] = data;
        return { stories: newStories };
      } else {
        // From another user, or temp story not found
        const hasTempStory = state.stories.some(s => s.id.startsWith('temp-'));
        if (!hasTempStory) {
          // Definitely from another user
          return { stories: [...state.stories, data] };
        }
        // Has temp but didn't match - still add (rare edge case)
        return { stories: [...state.stories, data] };
      }
    });
  },

  handleStoryUpdated: (data) => {
    set((state) => ({
      stories: state.stories.map((s) =>
        s.id === data.id ? { ...s, ...data } : s
      ),
    }));
  },

  handleStoryDeleted: (data) => {
    set((state) => ({
      stories: state.stories.filter((s) => s.id !== data.id),
    }));
  },

  handleStoryMoved: (data) => {
    set((state) => ({
      stories: state.stories.map((s) =>
        s.id === data.id ? { ...s, ...data } : s
      ),
    }));
  },

  // Setup socket listeners
  setupSocketListeners: () => {
    const socket = useSocketStore.getState().socket;

    socket?.on('story.created', get().handleStoryCreated);
    socket?.on('story.updated', get().handleStoryUpdated);
    socket?.on('story.deleted', get().handleStoryDeleted);
    socket?.on('story.moved', get().handleStoryMoved);
  },

  // Cleanup socket listeners
  cleanupSocketListeners: () => {
    const socket = useSocketStore.getState().socket;

    socket?.off('story.created', get().handleStoryCreated);
    socket?.off('story.updated', get().handleStoryUpdated);
    socket?.off('story.deleted', get().handleStoryDeleted);
    socket?.off('story.moved', get().handleStoryMoved);
  },
}));
```

### React Component Usage

```typescript
// apps/frontend/src/pages/StoryMapPage.tsx
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocketStore } from '@/stores/useSocketStore';
import { useStoryMapStore } from '@/stores/useStoryMapStore';
import { useAuth } from '@/hooks/useAuth'; // Your auth hook

export function StoryMapPage() {
  const { mapId } = useParams();
  const { token } = useAuth();
  const { connect, disconnect, joinMap, leaveMap, isConnected } = useSocketStore();
  const { setupSocketListeners, cleanupSocketListeners } = useStoryMapStore();

  useEffect(() => {
    if (token) {
      // Connect to WebSocket
      connect(token);

      // Setup event listeners
      setupSocketListeners();

      return () => {
        cleanupSocketListeners();
        disconnect();
      };
    }
  }, [token]);

  useEffect(() => {
    if (isConnected && mapId) {
      // Join this map's room
      joinMap(mapId);

      return () => {
        leaveMap(mapId);
      };
    }
  }, [isConnected, mapId]);

  return (
    <div>
      {!isConnected && (
        <div className="connection-status">
          Reconnecting...
        </div>
      )}

      {/* Your story map UI */}
    </div>
  );
}
```

### Drag-and-Drop with Real-Time Sync

```typescript
// Example with react-beautiful-dnd
const handleDragEnd = (result) => {
  if (!result.destination) return;

  const storyId = result.draggableId;
  const [destStepId, destReleaseId] = result.destination.droppableId.split(':');

  // Optimistic update + WebSocket emit
  moveStory(storyId, destStepId, destReleaseId, mapId);
};
```

---

## Testing Strategy

### Unit Tests

```typescript
// apps/backend/src/modules/story-maps/story-maps.gateway.spec.ts
import { Test } from '@nestjs/testing';
import { StoryMapsGateway } from './story-maps.gateway';
import { StoryMapsService } from './story-maps.service';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';

describe('StoryMapsGateway', () => {
  let app: INestApplication;
  let clientSocket: Socket;
  let gateway: StoryMapsGateway;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [StoryMapsGateway, StoryMapsService],
    }).compile();

    app = moduleRef.createNestApplication();
    gateway = moduleRef.get(StoryMapsGateway);

    await app.listen(3001);

    // Connect test client
    clientSocket = io('http://localhost:3001/story-maps', {
      auth: { token: 'test-jwt-token' },
    });
  });

  afterAll(async () => {
    clientSocket.disconnect();
    await app.close();
  });

  it('should emit story.created when story is created', (done) => {
    clientSocket.on('story.created', (data) => {
      expect(data.title).toBe('Test Story');
      done();
    });

    clientSocket.emit('story.create', {
      mapId: 'map-123',
      stepId: 'step-1',
      releaseId: 'release-1',
      title: 'Test Story',
    });
  });

  it('should join map room successfully', (done) => {
    clientSocket.on('map.joined', (data) => {
      expect(data.mapId).toBe('map-123');
      done();
    });

    clientSocket.emit('map.join', { mapId: 'map-123' });
  });
});
```

### Integration Tests

Test full flow with database:

```typescript
describe('Real-time story collaboration', () => {
  it('should sync story updates between two clients', async () => {
    const client1 = io('http://localhost:3001', {
      auth: { token: 'test-jwt-token-1' }
    });
    const client2 = io('http://localhost:3001', {
      auth: { token: 'test-jwt-token-2' }
    });

    // Both join same map
    client1.emit('map.join', { mapId: 'map-123' });
    client2.emit('map.join', { mapId: 'map-123' });

    // Client 2 listens for updates
    client2.on('story.updated', (data) => {
      expect(data.title).toBe('Updated by Client 1');
    });

    // Client 1 updates story
    client1.emit('story.update', {
      id: 'story-123',
      title: 'Updated by Client 1',
      mapId: 'map-123',
    });
  });
});
```

---

## Deployment Considerations

### Production Configuration

```typescript
// apps/backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StoryMapsGateway } from './modules/story-maps/story-maps.gateway';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Socket.IO with Redis adapter for horizontal scaling
  if (process.env.NODE_ENV === 'production') {
    const { createAdapter } = require('@socket.io/redis-adapter');
    const { createClient } = require('redis');

    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    // Enable CORS
    app.enableCors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
    });

    // Access the gateway and apply Redis adapter
    const storyMapsGateway = app.get(StoryMapsGateway);
    storyMapsGateway.server.adapter(createAdapter(pubClient, subClient));
  }

  await app.listen(3000);
}

bootstrap();
```

### Environment Variables

```bash
# .env.production
FRONTEND_URL=https://your-app.com
SUPABASE_JWT_SECRET=your-jwt-secret
REDIS_URL=redis://localhost:6379  # For multi-server scaling
```

### Scaling Considerations

**Current Scale (5 users/map):**
- ✅ Single server is sufficient
- ✅ No Redis needed

**Future Scale (50+ users/map, multiple servers):**
- Use Redis adapter for Socket.IO
- Enable sticky sessions on load balancer
- Consider separate WebSocket server

### Monitoring

Track these metrics:
- Connected sockets count
- Messages per second
- Room sizes
- Connection/disconnection rate
- Error rate by event type

```typescript
// Simple metrics
gateway.afterInit((server) => {
  setInterval(() => {
    const socketsCount = server.sockets.sockets.size;
    console.log(`Connected sockets: ${socketsCount}`);
  }, 60000); // Every minute
});
```

---

## Summary

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Library** | Socket.IO | Active maintenance, rooms, auto-reconnect |
| **Conflict Resolution** | Last-Write-Wins | Simple, works great for 5 users |
| **Authentication** | JWT in handshake | Industry standard, secure |
| **Event Granularity** | Coarse-grained deltas | Balance between bandwidth and simplicity |
| **State Management** | Zustand | Already in use, lightweight |
| **Scaling** | Single server (for now) | 5 users/map doesn't need Redis |

### Implementation Checklist

Backend:
- [ ] Install `@nestjs/websockets` and `socket.io`
- [ ] Create WebSocket gateway module
- [ ] Implement JWT middleware
- [ ] Add permission guards
- [ ] Define event handlers (create, update, delete, move)
- [ ] Add room management (join/leave)
- [ ] Implement sync mechanism for reconnects
- [ ] Write unit tests

Frontend:
- [ ] Install `socket.io-client`
- [ ] Create Zustand socket store
- [ ] Implement optimistic updates
- [ ] Add reconnection UI indicator
- [ ] Handle server events
- [ ] Test concurrent editing scenarios
- [ ] Add error handling and user feedback

---

## Next Steps

1. **Phase 1:** Implement basic CRUD events (stories only)
2. **Phase 2:** Add drag-and-drop real-time sync
3. **Phase 3:** Add comments real-time
4. **Phase 4:** Add release/step management events
5. **Phase 5:** Optimize and monitor performance

---

**Questions?** Refer to:
- [Socket.IO Official Docs](https://socket.io/docs/v4/)
- [NestJS WebSockets](https://docs.nestjs.com/websockets/gateways)
- [Zustand Docs](https://zustand-demo.pmnd.rs/)
