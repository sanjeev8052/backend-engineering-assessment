import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { uploadFileToGCS } from '../services/gcs.service';
import { processCsvStream } from '../services/parser.service';
import { createOrderBatcher } from '../services/order.service';
import { getShardClient, getAllShardClients, shardClients } from '../config/prisma';

export const uploadOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded.' });
    return;
  }

  const filePath = req.file.path;
  const fileName = `orders-${Date.now()}-${req.file.originalname}`;

  try {
    let gcsPath: string | null = null;
    try {
      gcsPath = await uploadFileToGCS(filePath, fileName);
    } catch (gcsErr) {
      console.warn('[GCS Warning] GCS upload skipped or failed:', (gcsErr as Error).message);
    }

    const orderBatcher = createOrderBatcher();

    const summary = await processCsvStream(filePath, async (order) => {
      await orderBatcher.pushRecord(order);
    });

    await orderBatcher.flushAll();

    res.status(200).json({
      success: true,
      message: 'File uploaded and sharded successfully.',
      gcsPath,
      metrics: summary,
    });
  } catch (error) {
    next(error);
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

export const getOrdersByCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { customerId } = req.query;
    if (!customerId || typeof customerId !== 'string') {
      res.status(400).json({ success: false, message: 'customerId query parameter is required.' });
      return;
    }

    const client = getShardClient(customerId);
    const orders = await client.order.findMany({ where: { customer_id: customerId } });

    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orderId = req.params.orderId as string;
    const { customerId } = req.query;

    if (customerId && typeof customerId === 'string') {
      const client = getShardClient(customerId);
      const order = await client.order.findUnique({ where: { order_id: orderId } });
      res.status(200).json({ success: true, order });
      return;
    }

    const allClients = getAllShardClients();
    const results = await Promise.all(
      allClients.map((client) => client.order.findUnique({ where: { order_id: orderId } }))
    );
    const order = results.find((r) => r !== null) || null;

    res.status(200).json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

export const healthCheck = async (_req: Request, res: Response): Promise<void> => {
  try {
    await Promise.all(shardClients.map((client) => client.$queryRaw`SELECT 1`));
    res.status(200).json({ status: 'UP', shards: 'All 3 shards connected.' });
  } catch (err) {
    res.status(500).json({ status: 'DOWN', error: (err as Error).message });
  }
};