'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.app = void 0;
const cors_1 = __importDefault(require('cors'));
const express_1 = __importDefault(require('express'));
const helmet_1 = __importDefault(require('helmet'));
const error_handler_1 = require('./middleware/error-handler');
const not_found_1 = require('./middleware/not-found');
const projects_routes_1 = require('./routes/projects.routes');
const sessions_routes_1 = require('./routes/sessions.routes');
exports.app = (0, express_1.default)();
exports.app.use((0, helmet_1.default)());
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json());
exports.app.get('/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'loopr-api',
  });
});
exports.app.use('/api/v1/projects', projects_routes_1.projectsRouter);
exports.app.use('/api/v1/sessions', sessions_routes_1.sessionsRouter);
exports.app.use(not_found_1.notFoundHandler);
exports.app.use(error_handler_1.errorHandler);
