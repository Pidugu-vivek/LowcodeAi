import { createApp } from './app';
import { logger } from './logging/logger';

const PORT = Number(process.env.PORT ?? 3000);

const app = createApp();

app.listen(PORT, () => {
  logger.info(`API orchestration platform listening on port ${PORT}`);
});
