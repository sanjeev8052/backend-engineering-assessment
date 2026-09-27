import crypto from 'crypto';

export const getShardIndex = (key: string, totalShards: number): number => {
  const hash = crypto.createHash('md5').update(key).digest('hex');
  const numericValue = Math.abs(parseInt(hash.substring(0, 8), 16));
  return numericValue % totalShards;
};