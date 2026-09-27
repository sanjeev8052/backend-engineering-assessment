import fs from 'fs';
import csvParser from 'csv-parser';
import { validateOrderRow, ValidatedOrder, RawOrderRecord } from '../utils/validator';

export interface IngestionSummary {
  totalProcessed: number;
  inserted: number;
  skipped: number;
}

export const processCsvStream = async (
  filePath: string,
  onValidRow: (row: ValidatedOrder) => Promise<void>
): Promise<IngestionSummary> => {
  let totalProcessed = 0;
  let inserted = 0;
  let skipped = 0;

  const parser = fs.createReadStream(filePath).pipe(csvParser());

  for await (const rawRow of parser) {
    totalProcessed++;
    const valid = validateOrderRow(rawRow as RawOrderRecord);
    if (!valid) {
      skipped++;
      continue;
    }

    try {
      await onValidRow(valid);
      inserted++;
    } catch (err) {
      skipped++;
    }
  }

  return { totalProcessed, inserted, skipped };
};