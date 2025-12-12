import { Router } from 'express';
import { UserRole } from '@prisma/client';
import {
  addMember,
  createTeam,
  deleteTeam,
  getTeam,
  listTeams,
  removeMember,
  updateTeam,
} from '../controllers/teamController';
import { authenticate } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { validateBody, validateParams } from '../middlewares/validateRequest';
import { createTeamSchema, addTeamMemberSchema, updateTeamSchema } from '../validations/teamSchemas';
import { teamIdParamSchema, userIdParamSchema } from '../validations/commonSchemas';

const router = Router();

router.use(authenticate);

router.get('/', listTeams);
router.get('/:teamId', validateParams(teamIdParamSchema), getTeam);

router.post('/', requireRole([UserRole.admin]), validateBody(createTeamSchema), createTeam);
router.patch(
  '/:teamId',
  requireRole([UserRole.admin]),
  validateParams(teamIdParamSchema),
  validateBody(updateTeamSchema),
  updateTeam,
);
router.delete('/:teamId', requireRole([UserRole.admin]), validateParams(teamIdParamSchema), deleteTeam);
router.post(
  '/:teamId/members',
  requireRole([UserRole.admin]),
  validateParams(teamIdParamSchema),
  validateBody(addTeamMemberSchema),
  addMember,
);
router.delete(
  '/:teamId/members/:userId',
  requireRole([UserRole.admin]),
  validateParams(teamIdParamSchema.merge(userIdParamSchema)),
  removeMember,
);

export default router;
