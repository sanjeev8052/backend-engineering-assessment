import fs from 'fs';
import { ordersBucket } from '../config/gcs';

export const uploadFileToGCS = async (filePath: string, destinationName: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const writeStream = ordersBucket.file(destinationName).createWriteStream({
      resumable: false,
      gzip: true,
    });

    fs.createReadStream(filePath)
      .pipe(writeStream)
      .on('finish', () => resolve(`gs://${ordersBucket.name}/${destinationName}`))
      .on('error', (err) => reject(err));
  });
};