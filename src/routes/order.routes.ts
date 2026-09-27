import { Router } from 'express';
import { upload } from '../middlewares/upload.middleware';
import {
  uploadOrders,
  getOrdersByCustomer,
  getOrderById,
  healthCheck,
} from '../controllers/order.controller';

const router = Router();

router.post('/upload-orders', upload.single('file'), uploadOrders);
router.get('/orders', getOrdersByCustomer);
router.get('/orders/:orderId', getOrderById);
router.get('/health', healthCheck);

export default router;