export interface EnvironmentConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  supabase: {
    url: string;
    anonKey: string;
  };
}

export const getEnvironmentConfig = (): EnvironmentConfig => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
  }

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api',
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    },
  };
};
