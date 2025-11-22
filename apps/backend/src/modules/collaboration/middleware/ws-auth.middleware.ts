import { createClient } from '@supabase/supabase-js';
import { Socket } from 'socket.io';
import { SocketWithAuth } from '../types/socket-with-auth.type';
import { getEnvironmentConfig } from '../../../config/environment.config';

/**
 * WebSocket JWT authentication middleware using Supabase
 * Validates JWT tokens during the handshake and attaches user to socket
 */
export const WsAuthMiddleware = () => {
  return async (socket: Socket, next: (err?: Error) => void) => {
    const authSocket = socket as SocketWithAuth;
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const config = getEnvironmentConfig();

      // Create Supabase client with the user's token
      const supabase = createClient(config.supabase.url, config.supabase.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });

      // Validate token with Supabase (same approach as HTTP guard)
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return next(new Error('Authentication failed: Invalid or expired token'));
      }

      // Attach user to socket for all subsequent events
      authSocket.user = user;
      authSocket.data.user = user;

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  };
};
