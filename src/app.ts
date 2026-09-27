import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { requestLogger } from './middlewares/logger.middleware';
import { errorHandler } from './middlewares/error.middleware';
import { swaggerSpec } from './config/swagger';
import routes from './routes';

const app = express();

app.use(express.json());
app.use(requestLogger);

// Swagger API Documentation UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/', routes);
app.use(errorHandler);

export default app;