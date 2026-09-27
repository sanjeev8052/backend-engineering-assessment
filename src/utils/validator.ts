export interface RawOrderRecord {
  order_id?: string;
  customer_id?: string;
  order_date?: string;
  order_amount?: string;
  status?: string;
}

export interface ValidatedOrder {
  order_id: string;
  customer_id: string;
  order_date: Date;
  order_amount: number;
  status: string;
}

export const validateOrderRow = (row: RawOrderRecord): ValidatedOrder | null => {
  const order_id = row.order_id?.toString().trim();
  const customer_id = row.customer_id?.toString().trim();
  const order_date = row.order_date?.toString().trim();
  const order_amount = row.order_amount?.toString().trim();
  const status = row.status?.toString().trim();

  if (!order_id || !customer_id || !order_date || order_amount === undefined || order_amount === '' || !status) {
    return null;
  }

  const parsedDate = new Date(order_date);
  const parsedAmount = parseFloat(order_amount);

  if (isNaN(parsedDate.getTime()) || isNaN(parsedAmount) || parsedAmount < 0) {
    return null;
  }

  return {
    order_id,
    customer_id,
    order_date: parsedDate,
    order_amount: parsedAmount,
    status,
  };
};