import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import config from './config/env';
import { logger } from './middlewares/logger';

const app = express();

app.use(cors({ origin: config.corsOrigin === '*' ? undefined : config.corsOrigin }));
app.use(express.json());
app.use(logger);

app.use('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);
app.use(errorHandler);

export default app;
