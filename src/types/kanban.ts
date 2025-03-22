import { Job } from './job';

export interface KanbanColumn {
  id: string;
  title: string;
  jobs: Job[];
} 