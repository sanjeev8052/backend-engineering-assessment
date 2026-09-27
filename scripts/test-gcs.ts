import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { uploadFileToGCS } from '../src/services/gcs.service';
import { ordersBucket } from '../src/config/gcs';

async function testGCS() {
  console.log('--- Testing GCS Integration ---');
  console.log(`Bucket Name: ${ordersBucket.name}`);
  console.log(`Emulator Host: ${process.env.STORAGE_EMULATOR_HOST || 'None (Using Production ADC)'}`);

  const tempFilePath = path.join(__dirname, 'temp-test.txt');
  const testFileName = `test-file-${Date.now()}.txt`;

  try {
    fs.writeFileSync(tempFilePath, 'Hello GCS Emulator Integration Test!');

    console.log(`Uploading test file "${testFileName}" to GCS via uploadFileToGCS...`);
    const gcsPath = await uploadFileToGCS(tempFilePath, testFileName);
    console.log(`File uploaded successfully to: ${gcsPath}`);

    // Clean up local temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    console.log('✅ GCS Integration Test Passed Successfully!');
  } catch (error) {
    console.error('❌ GCS Integration Test Failed:');
    console.error((error as Error).message);

    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    process.exit(1);
  }
}

testGCS();
