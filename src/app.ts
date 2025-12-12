import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import config from './config/env';

const app = express();

app.use(cors({ origin: config.corsOrigin === '*' ? undefined : config.corsOrigin }));
app.use(express.json());

app.use('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);
app.use(errorHandler);

export default app;
