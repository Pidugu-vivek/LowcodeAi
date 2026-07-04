import { createApp } from './app';
import { logger } from './logging/logger';

const PORT = Number(process.env.PORT) || 3000;

// Sample workflow configs call back into this same process to reach the mock
// vendor routes; default it to this server's own port unless overridden.
process.env.SELF_BASE_URL = process.env.SELF_BASE_URL || `http://localhost:${PORT}`;

const app = createApp();

app.listen(PORT, () => {
  logger.info(`Low-Code API Orchestration Platform listening on port ${PORT}`);
});
