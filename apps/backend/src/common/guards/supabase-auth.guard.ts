import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../modules/supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      // Get the user from the Supabase client (which uses the token from headers)
      const { data: { user }, error } = await this.supabaseService.auth.getUser();

      if (error || !user) {
        throw new UnauthorizedException('Invalid or missing authentication token');
      }

      // Attach user to request for use in controllers
      request.user = user;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
