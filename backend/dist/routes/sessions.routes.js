'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.sessionsRouter = void 0;
const express_1 = require('express');
exports.sessionsRouter = (0, express_1.Router)();
exports.sessionsRouter.get('/', (_request, response) => {
  response.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'Session listing will be connected to persistence later.',
    },
  });
});
