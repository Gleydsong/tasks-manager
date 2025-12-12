import express from 'express';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(express.json());
app.use('/health', (_req, res) => res.json({ status: 'ok' }));
app.use(routes);
app.use(errorHandler);

export default app;
