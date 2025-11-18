export interface EnvironmentConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
}

export const getEnvironmentConfig = (): EnvironmentConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
});
