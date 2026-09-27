import dotenv from 'dotenv';
dotenv.config();

if (process.env.STORAGE_EMULATOR_HOST && !process.env.GCP_PROJECT && !process.env.GOOGLE_CLOUD_PROJECT) {
  process.env.GCP_PROJECT = 'emulator-project';
}

export const ENV = {
  PORT:process.env.PORT || 3000,  
  NODE_ENV: process.env.NODE_ENV || 'development',
  GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME || 'orders-bucket',
  STORAGE_EMULATOR_HOST: process.env.STORAGE_EMULATOR_HOST || '',
  SHARDS: [
    process.env.DATABASE_URL_SHARD_1 || 'postgresql://postgres:root@localhost:5432/shard_1?schema=public',
    process.env.DATABASE_URL_SHARD_2 || 'postgresql://postgres:root@localhost:5432/shard_2?schema=public',
    process.env.DATABASE_URL_SHARD_3 || 'postgresql://postgres:root@localhost:5432/shard_3?schema=public',
  ],
};