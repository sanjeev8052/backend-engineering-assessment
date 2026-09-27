import { PrismaClient } from '@prisma/client';
import { ENV } from './env';
import { getShardIndex } from '../utils/hasher';

export const shardClients: PrismaClient[] = ENV.SHARDS.map((url) => {
  return new PrismaClient({
    datasources: { db: { url } },
  });
});

export const getShardClient = (customerId: string): PrismaClient => {
  const index = getShardIndex(customerId, shardClients.length);
  return shardClients[index];
};

export const getAllShardClients = (): PrismaClient[] => {
  return shardClients;
};