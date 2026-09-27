import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const shards = [
  process.env.DATABASE_URL_SHARD_1 ,
  process.env.DATABASE_URL_SHARD_2 ,
  process.env.DATABASE_URL_SHARD_3 ,
];

for (let i = 0; i < shards.length; i++) {
  console.log(`Applying migrations to Shard ${i + 1}...`);
  try {
    execSync(`npx prisma db push`, {
      env: { ...process.env, DATABASE_URL: shards[i] },
      stdio: 'inherit',
    });
  } catch (err) {
    console.error(`Failed to migrate Shard ${i + 1}`);
    process.exit(1);
  }
}

console.log('All shards migrated successfully.');
