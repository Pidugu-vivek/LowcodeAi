import { Router } from 'express';
import { requireAdminApiKey } from '../middleware/auth';
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflow,
  listWorkflows,
  testWorkflow,
  updateWorkflow,
} from './controller';

export const adminApiRouter = Router();

adminApiRouter.use(requireAdminApiKey);
adminApiRouter.get('/apis', listWorkflows);
adminApiRouter.get('/apis/:id', getWorkflow);
adminApiRouter.post('/apis', createWorkflow);
adminApiRouter.put('/apis/:id', updateWorkflow);
adminApiRouter.delete('/apis/:id', deleteWorkflow);
adminApiRouter.post('/apis/:id/test', testWorkflow);

