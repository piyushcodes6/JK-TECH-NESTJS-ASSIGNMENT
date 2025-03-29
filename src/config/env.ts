import { registerAs } from '@nestjs/config';
import * as dotenv from 'dotenv';

dotenv.config();

export const databaseConfig = registerAs('database', () => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'nestjs_assignment',
  entities: ['dist/**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
  ssl: process.env.DB_SSL === 'true',
}));

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}));

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api',
  cors: {
    enabled: process.env.CORS_ENABLED === 'true',
    origin: process.env.CORS_ORIGIN || '*',
  },
}));

export const userConfig = registerAs('user', () => ({
  defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL || 'piyushcodes6@gmail.com',
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin1234!',
  passwordSaltRounds: parseInt(process.env.PASSWORD_SALT_ROUNDS || '10', 10),
}));

export const documentConfig = registerAs('document', () => ({
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB default
  allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain').split(','),
}));

export const ingestionConfig = registerAs('ingestion', () => ({
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL || 'http://localhost:5000',
  webhookEndpoint: process.env.WEBHOOK_ENDPOINT || '/webhook/ingestion',
  webhookSecret: process.env.WEBHOOK_SECRET || 'webhook-secret-key-change-in-production',
  queueSize: parseInt(process.env.INGESTION_QUEUE_SIZE || '100', 10),
  retryAttempts: parseInt(process.env.INGESTION_RETRY_ATTEMPTS || '3', 10),
}));

export default () => ({
  database: databaseConfig(),
  jwt: jwtConfig(),
  app: appConfig(),
  user: userConfig(),
  document: documentConfig(),
  ingestion: ingestionConfig(),
});

