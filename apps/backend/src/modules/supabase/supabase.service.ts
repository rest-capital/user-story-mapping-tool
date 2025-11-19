import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnvironmentConfig } from '../../config/environment.config';

@Injectable({ scope: Scope.REQUEST })
export class SupabaseService {
  private supabaseClient: SupabaseClient;

  constructor(@Inject(REQUEST) private readonly request: Request) {
    const config = getEnvironmentConfig();

    // Extract token from Authorization header
    const authHeader = this.request.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    // Create Supabase client for server-side use
    this.supabaseClient = createClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        auth: {
          // Don't persist session in server environment
          persistSession: false,
          // Don't auto-refresh tokens
          autoRefreshToken: false,
          // Don't detect session in URL
          detectSessionInUrl: false,
        },
        global: {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      },
    );
  }

  getClient(): SupabaseClient {
    return this.supabaseClient;
  }

  get auth() {
    return this.supabaseClient.auth;
  }
}
