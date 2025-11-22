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
}
