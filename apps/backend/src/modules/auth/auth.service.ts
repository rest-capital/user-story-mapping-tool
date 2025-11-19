import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async signUp(signUpDto: SignUpDto): Promise<AuthResponseDto> {
    const { email, password } = signUpDto;

    const { data, error } = await this.supabaseService.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data.session) {
      throw new BadRequestException('Failed to create session. Please check your email for confirmation.');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in || 3600,
      user: {
        id: data.user!.id,
        email: data.user!.email!,
        created_at: data.user!.created_at,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const { data, error } = await this.supabaseService.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      user: {
        id: data.user.id,
        email: data.user.email!,
        created_at: data.user.created_at,
      },
    };
  }

  async logout(): Promise<{ message: string }> {
    const { error } = await this.supabaseService.auth.signOut();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Successfully logged out' };
  }

  async getProfile() {
    const { data: user, error } = await this.supabaseService.auth.getUser();

    if (error || !user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.user.id,
      email: user.user.email,
      created_at: user.user.created_at,
    };
  }
}
