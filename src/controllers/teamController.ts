import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { teamService } from '../services/teamService';

export const createTeam = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const team = await teamService.createTeam(name, description);
  return res.status(201).json({ team });
});

export const listTeams = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const teams = await teamService.listTeamsForUser(req.user!.id, req.user!.role);
  return res.json({ teams });
});

export const addMember = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const teamId = Number(req.params.teamId);
  const { userId } = req.body;

  const membership = await teamService.addMember(teamId, userId);
  return res.status(201).json({ membership });
});

export const getTeam = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const teamId = Number(req.params.teamId);
  const team = await teamService.getTeamWithMembers(teamId, req.user!.id, req.user!.role);
  return res.json({ team });
});
