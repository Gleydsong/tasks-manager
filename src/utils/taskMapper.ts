import { Task, TaskHistory, TaskPriority, TaskStatus } from '@prisma/client';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const statusLabel: Record<TaskStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em progresso',
  completed: 'Concluído',
};

const priorityLabel: Record<TaskPriority, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const statusInputMap: Record<string, TaskStatus> = {
  pending: 'pending',
  pendente: 'pending',
  'em progresso': 'in_progress',
  'em_progresso': 'in_progress',
  'em-progresso': 'in_progress',
  in_progress: 'in_progress',
  inprogresso: 'in_progress',
  completed: 'completed',
  concluido: 'completed',
  concluído: 'completed',
};

const priorityInputMap: Record<string, TaskPriority> = {
  high: 'high',
  alta: 'high',
  medium: 'medium',
  media: 'medium',
  média: 'medium',
  low: 'low',
  baixa: 'low',
};

export const parseStatusInput = (value?: unknown): TaskStatus | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const key = normalize(String(value));
  return statusInputMap[key];
};

export const parsePriorityInput = (value?: unknown): TaskPriority | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const key = normalize(String(value));
  return priorityInputMap[key];
};

export const taskToApi = (task: any) => ({
  ...task,
  status: statusLabel[task.status as TaskStatus],
  priority: priorityLabel[task.priority as TaskPriority],
  ...(task.history ? { history: task.history.map((h: TaskHistory) => historyToApi(h)) } : {}),
});

export const historyToApi = (history: TaskHistory) => ({
  ...history,
  oldStatus: statusLabel[history.oldStatus],
  newStatus: statusLabel[history.newStatus],
});
