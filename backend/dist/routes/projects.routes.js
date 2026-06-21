'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.projectsRouter = void 0;
const express_1 = require('express');
const validate_body_1 = require('../middleware/validate-body');
const project_schema_1 = require('../schemas/project.schema');
exports.projectsRouter = (0, express_1.Router)();
exports.projectsRouter.get('/', (_request, response) => {
  response.status(501).json({
    error: {
      code: 'not_implemented',
      message: 'Project listing will be connected to persistence later.',
    },
  });
});
exports.projectsRouter.post(
  '/',
  (0, validate_body_1.validateBody)(project_schema_1.createProjectSchema),
  (_request, response) => {
    response.status(501).json({
      error: {
        code: 'not_implemented',
        message: 'Project creation will be connected to persistence later.',
      },
    });
  }
);
