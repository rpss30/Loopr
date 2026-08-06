import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { audioRouter } from './routes/audio.routes';
import { projectsRouter } from './routes/projects.routes';
import { sessionsRouter } from './routes/sessions.routes';
import { tracksRouter } from './routes/tracks.routes';
import { projectService } from './services/project.service';
import { sessionService } from './services/session.service';
import { trackService } from './services/track.service';

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
app.use('/api/v1/audio', audioRouter);
app.use('/api/v1/tracks', tracksRouter);

if (env.NODE_ENV === 'test') {
  app.post('/api/v1/e2e/reset', async (_request, response, next) => {
    try {
      await trackService.reset();
      await sessionService.reset();
      await projectService.reset();

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });
}

app.use(notFoundHandler);
app.use(errorHandler);
