import express from 'express';
import cors from 'cors';
import { config } from './config';
import { checkDbConnection } from './db/client';
import { chatRouter } from './routes/chat.routes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors({ origin: config.cors.origins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/chat', chatRouter);

app.use(notFoundHandler);
app.use(errorHandler);

process.on('unhandledRejection', (reason) => {
  console.error('[process] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[process] Uncaught exception:', err);
});

function start(): void {
  try {
    checkDbConnection();
  } catch (err) {
    console.error('[startup] Database connection failed — cannot start server:', err);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`[server] Listening on http://localhost:${config.port}`);
  });
}

start();
