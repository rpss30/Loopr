import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { projectsRouter } from './routes/projects.routes';
import { sessionsRouter } from './routes/sessions.routes';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'loopr-api',
  });
});

app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/sessions', sessionsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
