'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createProjectSchema = void 0;
const zod_1 = require('zod');
exports.createProjectSchema = zod_1.z.object({
  name: zod_1.z.string().trim().min(1).max(80),
  bpm: zod_1.z.number().int().min(40).max(240).optional(),
});
