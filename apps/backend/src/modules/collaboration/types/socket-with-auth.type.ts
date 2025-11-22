import { Socket } from 'socket.io';
import { User } from '@supabase/supabase-js';

export type SocketWithAuth = Socket & {
  user: User;
  data: Socket['data'] & {
    user: User;
  };
};
