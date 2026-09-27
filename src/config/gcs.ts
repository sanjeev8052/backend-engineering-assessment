import { Storage, StorageOptions } from '@google-cloud/storage';
import { ENV } from './env';

const options: StorageOptions = {};

if (ENV.STORAGE_EMULATOR_HOST) {
  // Remove STORAGE_EMULATOR_HOST from process.env so the SDK does NOT
  // activate its legacy emulator mode (which uses /b/... paths that
  // fake-gcs-server doesn't support). Instead we set apiEndpoint
  // explicitly, which makes the SDK use /storage/v1/... paths.
  delete process.env.STORAGE_EMULATOR_HOST;

  options.apiEndpoint = ENV.STORAGE_EMULATOR_HOST;
  options.projectId = 'emulator-project';
}
    
// In production (STORAGE_EMULATOR_HOST unset), options is empty →
// new Storage() automatically uses Application Default Credentials (ADC).
export const storage = new Storage(options);
export const ordersBucket = storage.bucket(ENV.GCS_BUCKET_NAME);