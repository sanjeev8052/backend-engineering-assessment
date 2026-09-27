import app from './app';
import { ENV } from './config/env';

const server = app.listen(ENV.PORT, () => {
  console.log(`Server listening on port ${ENV.PORT} in ${ENV.NODE_ENV} mode.`);
});

const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);