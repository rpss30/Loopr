import { Router } from 'express';

export const sessionsRouter = Router();

sessionsRouter.get('/', (_request, response) => {
  response.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'Session listing will be connected to persistence later.',
    },
  });
});
