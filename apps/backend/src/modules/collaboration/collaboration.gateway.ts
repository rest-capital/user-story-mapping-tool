import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, ValidationPipe, UsePipes } from '@nestjs/common';
import { WsAuthMiddleware } from './middleware/ws-auth.middleware';
import { SocketWithAuth } from './types/socket-with-auth.type';
import { CollaborationService } from './collaboration.service';
import { JoinRoomDto } from './dto/join-room.dto';
import {
  CreateStoryEventDto,
  UpdateStoryEventDto,
  MoveStoryEventDto,
  DeleteStoryEventDto,
} from './dto/story-events.dto';

@WebSocketGateway({
  namespace: '/collaboration',
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
})
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CollaborationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private logger = new Logger('CollaborationGateway');

  constructor(private readonly collaborationService: CollaborationService) {}

  afterInit(server: Server) {
    // Apply JWT middleware to all connections
    server.use(WsAuthMiddleware());
    this.logger.log('WebSocket Gateway initialized with JWT middleware');
  }

  handleConnection(socket: SocketWithAuth) {
    this.logger.log(
      `Client connected: ${socket.id} (User: ${socket.user.email})`,
    );
  }

  handleDisconnect(socket: SocketWithAuth) {
    this.logger.log(`Client disconnected: ${socket.id}`);
    // Socket.IO automatically removes socket from all rooms
  }

  /**
   * Join a story map room
   */
  @SubscribeMessage('map.join')
  async handleJoinMap(
    @ConnectedSocket() socket: SocketWithAuth,
    @MessageBody() data: JoinRoomDto,
  ) {
    try {
      const { mapId } = data;

      // Validate user has access to this map
      const hasAccess = await this.collaborationService.hasMapAccess(
        socket.user.id,
        mapId,
      );

      if (!hasAccess) {
        socket.emit('error', {
          message: 'Access denied to this story map',
          code: 'ACCESS_DENIED',
          context: { mapId, operation: 'map.join' },
        });
        return;
      }

      // Join the room
      const roomName = `map:${mapId}`;
      await socket.join(roomName);

      // Get list of connected users in this room
      const socketsInRoom = await this.server.in(roomName).fetchSockets();
      const connectedUsers = (socketsInRoom as unknown as SocketWithAuth[]).map((s) => ({
        id: s.user.id,
        email: s.user.email,
      }));

      // Notify user they joined
      socket.emit('map.joined', {
        mapId,
        connectedUsers,
      });

      // Notify others in the room
      socket.to(roomName).emit('user.joined', {
        userId: socket.user.id,
        userEmail: socket.user.email,
      });

      this.logger.log(`User ${socket.user.id} joined map ${mapId}`);
    } catch (error) {
      this.logger.error(
        `Error joining map: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      socket.emit('error', {
        message: 'Failed to join story map',
        code: 'JOIN_FAILED',
        context: { mapId: data.mapId, operation: 'map.join' },
      });
    }
  }

  /**
   * Leave a story map room
   */
  @SubscribeMessage('map.leave')
  handleLeaveMap(
    @ConnectedSocket() socket: SocketWithAuth,
    @MessageBody() data: JoinRoomDto,
  ) {
    const { mapId } = data;
    const roomName = `map:${mapId}`;

    socket.leave(roomName);

    // Notify others
    socket.to(roomName).emit('user.left', {
      userId: socket.user.id,
    });

    this.logger.log(`User ${socket.user.id} left map ${mapId}`);
  }

  /**
   * Create a story (broadcasted to all users in room including sender)
   */
  @SubscribeMessage('story.create')
  async handleCreateStory(
    @ConnectedSocket() socket: SocketWithAuth,
    @MessageBody() data: CreateStoryEventDto,
  ) {
    try {
      // Check edit permission
      const canEdit = await this.collaborationService.canEdit(
        socket.user.id,
        data.mapId,
      );

      if (!canEdit) {
        socket.emit('error', {
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          context: { mapId: data.mapId, operation: 'story.create' },
        });
        return;
      }

      // Create story
      const story = await this.collaborationService.createStory(
        data,
        socket.user.id,
      );

      // Broadcast to ALL users in the room using in() instead of to()
      const roomName = `map:${data.mapId}`;
      this.server.in(roomName).emit('story.created', story);

      this.logger.log(
        `Story created: ${story.id} by ${socket.user.id} in map ${data.mapId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create story';
      this.logger.error(`Error creating story: ${errorMessage}`);
      socket.emit('error', {
        message: errorMessage,
        code: 'CREATE_FAILED',
        context: { mapId: data.mapId, operation: 'story.create' },
      });
    }
  }

  /**
   * Update a story (broadcasted to other users only)
   */
  @SubscribeMessage('story.update')
  async handleUpdateStory(
    @ConnectedSocket() socket: SocketWithAuth,
    @MessageBody() data: UpdateStoryEventDto,
  ) {
    try {
      const canEdit = await this.collaborationService.canEdit(
        socket.user.id,
        data.mapId,
      );

      if (!canEdit) {
        socket.emit('error', {
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          context: { mapId: data.mapId, operation: 'story.update' },
        });
        return;
      }

      const story = await this.collaborationService.updateStory(
        data.id,
        data,
        socket.user.id,
      );

      // Broadcast only to OTHERS (sender already has optimistic update)
      const roomName = `map:${data.mapId}`;
      socket.to(roomName).emit('story.updated', story);

      this.logger.log(`Story updated: ${data.id} by ${socket.user.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update story';
      this.logger.error(`Error updating story: ${errorMessage}`);
      socket.emit('error', {
        message: errorMessage,
        code: 'UPDATE_FAILED',
        context: { storyId: data.id, mapId: data.mapId, operation: 'story.update' },
      });
    }
  }

  /**
   * Move a story (broadcasted to other users only)
   */
  @SubscribeMessage('story.move')
  async handleMoveStory(
    @ConnectedSocket() socket: SocketWithAuth,
    @MessageBody() data: MoveStoryEventDto,
  ) {
    try {
      const canEdit = await this.collaborationService.canEdit(
        socket.user.id,
        data.mapId,
      );

      if (!canEdit) {
        socket.emit('error', {
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          context: { mapId: data.mapId, operation: 'story.move' },
        });
        return;
      }

      const story = await this.collaborationService.moveStory(
        data.id,
        data.toStepId,
        data.toReleaseId,
        socket.user.id,
      );

      // Broadcast to others
      const roomName = `map:${data.mapId}`;
      socket.to(roomName).emit('story.moved', story);

      this.logger.log(`Story moved: ${data.id} by ${socket.user.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to move story';
      this.logger.error(`Error moving story: ${errorMessage}`);
      socket.emit('error', {
        message: errorMessage,
        code: 'MOVE_FAILED',
        context: { storyId: data.id, mapId: data.mapId, operation: 'story.move' },
      });
    }
  }

  /**
   * Delete a story (broadcasted to all users in room)
   */
  @SubscribeMessage('story.delete')
  async handleDeleteStory(
    @ConnectedSocket() socket: SocketWithAuth,
    @MessageBody() data: DeleteStoryEventDto,
  ) {
    try {
      const canEdit = await this.collaborationService.canEdit(
        socket.user.id,
        data.mapId,
      );

      if (!canEdit) {
        socket.emit('error', {
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          context: { mapId: data.mapId, operation: 'story.delete' },
        });
        return;
      }

      const result = await this.collaborationService.deleteStory(
        data.id,
        socket.user.id,
      );

      // Broadcast to all users in room
      const roomName = `map:${data.mapId}`;
      this.server.in(roomName).emit('story.deleted', result);

      this.logger.log(`Story deleted: ${data.id} by ${socket.user.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete story';
      this.logger.error(`Error deleting story: ${errorMessage}`);
      socket.emit('error', {
        message: errorMessage,
        code: 'DELETE_FAILED',
        context: { storyId: data.id, mapId: data.mapId, operation: 'story.delete' },
      });
    }
  }
}
