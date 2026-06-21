'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.errorHandler = void 0;
const errorHandler = (error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    error: {
      code: 'internal_server_error',
      message: 'Something went wrong.',
    },
  });
};
exports.errorHandler = errorHandler;
