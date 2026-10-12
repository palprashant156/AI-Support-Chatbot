import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { migrate } from './database/migrate.js';

const app = createApp();
const port = env.port;

migrate()
  .catch((e) => logger.warn('migrate skipped/failed', { error: String(e) }))
  .finally(() => {
    app.listen(port, () => logger.info(`SupportFlow API listening`, { port, provider: env.llmProvider }));
  });
