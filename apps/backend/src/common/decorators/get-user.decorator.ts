import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@supabase/supabase-js';

/**
 * Decorator to extract the authenticated user from the request.
 * Must be used with SupabaseAuthGuard.
 *
 * @example
 * @Get('profile')
 * @UseGuards(SupabaseAuthGuard)
 * getProfile(@GetUser() user: User) {
 *   return { user };
 * }
 */
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new Error('User not found in request. Did you forget to use SupabaseAuthGuard?');
    }

    return data ? user[data] : user;
  },
);
