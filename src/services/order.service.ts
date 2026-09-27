    import { ValidatedOrder } from '../utils/validator';
    import { shardClients } from '../config/prisma';
    import { getShardIndex } from '../utils/hasher';

    export const createOrderBatcher = (batchSize = 500) => {
    const buffers: ValidatedOrder[][] = shardClients.map(() => []);

    const flushBuffer = async (shardIndex: number): Promise<void> => {
        const records = [...buffers[shardIndex]];
        buffers[shardIndex] = [];

        if (records.length === 0) return;

        await shardClients[shardIndex].order.createMany({
        data: records.map((r) => ({
            order_id: r.order_id,
            customer_id: r.customer_id,
            order_date: r.order_date,
            order_amount: r.order_amount,
            status: r.status,
        })),
        skipDuplicates: true,
        });
    };

    const pushRecord = async (order: ValidatedOrder): Promise<void> => {
        const shardIndex = getShardIndex(order.customer_id, shardClients.length);
        buffers[shardIndex].push(order);

        if (buffers[shardIndex].length >= batchSize) {
        await flushBuffer(shardIndex);
        }
    };

    const flushAll = async (): Promise<void> => {
        for (let i = 0; i < buffers.length; i++) {
        if (buffers[i].length > 0) {
            await flushBuffer(i);
        }
        }
    };

    return {
        pushRecord,
        flushAll,
    };
    };