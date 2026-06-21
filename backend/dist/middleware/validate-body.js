'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.validateBody = validateBody;
function validateBody(schema) {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      response.status(400).json({
        error: {
          code: 'invalid_request',
          message: 'Request body failed validation.',
          details: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
      return;
    }
    request.body = result.data;
    next();
  };
}
