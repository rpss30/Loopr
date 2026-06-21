import { RequestHandler } from 'express';

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    error: {
      code: 'not_found',
      message: `Route ${request.method} ${request.originalUrl} not found`,
    },
  });
};
