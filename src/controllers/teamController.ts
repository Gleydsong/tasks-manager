import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { teamService } from '../services/teamService';
import { sendSuccess } from '../utils/response';

export const createTeam = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const team = await teamService.createTeam(name, description);
  return res.status(201).json({ data: team });
});

export const listTeams = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const teams = await teamService.listTeamsForUser(req.user!.id, req.user!.role);
  return sendSuccess(res, teams);
});

export const addMember = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const teamId = Number(req.params.teamId);
  const { userId } = req.body;

  const membership = await teamService.addMember(teamId, userId);
  return res.status(201).json({ data: membership });
});

export const getTeam = asyncHandler(async (req: AuthenticatedRequest, res) => {
  const teamId = Number(req.params.teamId);
  const team = await teamService.getTeamWithMembers(teamId, req.user!.id, req.user!.role);
  return sendSuccess(res, team);
});

export const updateTeam = asyncHandler(async (req, res) => {
  const teamId = Number(req.params.teamId);
  const team = await teamService.updateTeam(teamId, req.body);
  return sendSuccess(res, team);
});

export const deleteTeam = asyncHandler(async (req, res) => {
  const teamId = Number(req.params.teamId);
  await teamService.deleteTeam(teamId);
  return res.status(204).send();
});

export const removeMember = asyncHandler(async (req, res) => {
  const teamId = Number(req.params.teamId);
  const userId = Number(req.params.userId);
  const membership = await teamService.removeMember(teamId, userId);
  return sendSuccess(res, membership);
});
