import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { addMember, createTeam, getTeam, listTeams } from '../controllers/teamController';
import { authenticate } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { validateBody, validateParams } from '../middlewares/validateRequest';
import { createTeamSchema, addTeamMemberSchema } from '../validations/teamSchemas';
import { teamIdParamSchema } from '../validations/commonSchemas';

const router = Router();

router.use(authenticate);

router.get('/', listTeams);
router.get('/:teamId', validateParams(teamIdParamSchema), getTeam);

router.post('/', requireRole([UserRole.admin]), validateBody(createTeamSchema), createTeam);
router.post(
  '/:teamId/members',
  requireRole([UserRole.admin]),
  validateParams(teamIdParamSchema),
  validateBody(addTeamMemberSchema),
  addMember,
);

export default router;
