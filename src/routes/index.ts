import { Router } from 'express';
import orderRoutes from './order.routes';

const rootRouter = Router();
rootRouter.use('/', orderRoutes);

export default rootRouter;