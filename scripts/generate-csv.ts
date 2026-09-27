import fs from 'fs';
import path from 'path';

const outPath = path.join(__dirname, '../orders-test-10k.csv');
const writeStream = fs.createWriteStream(outPath);

writeStream.write('order_id,customer_id,order_date,order_amount,status\n');

for (let i = 1; i <= 10000; i++) {
  const orderId = `ORD-${100000 + i}`;
  const customerId = `CUST-${(i % 500) + 1}`;
  const date = new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toISOString();
  const amount = (Math.random() * 500 + 10).toFixed(2);
  const status = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'][i % 4];

  writeStream.write(`${orderId},${customerId},${date},${amount},${status}\n`);
}

writeStream.end(() => {
  console.log(`Successfully generated 10,000 order rows at: ${outPath}`);
});