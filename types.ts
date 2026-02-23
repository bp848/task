
export type ViewType = 'today' | 'inbox' | 'planner' | 'schedule' | 'metrics' | 'habits' | 'settings' | 'project-detail';

export interface Email {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  date: string;
  isRead: boolean;
  customerName?: string;
  projectName?: string;
}

export interface Task {
  id: string;
  title: string;
  customerName?: string; 
  projectName?: string;  
  details?: string; 
  evidence?: string; 
  completed: boolean;
  timeSpent: number; 
  estimatedTime: number; 
  startTime?: string; 
  endTime?: string;   
  tags: string[];
  projectId: string;
  date: string; 
  createdAt: string;
  completedAt?: string;
  isRoutine?: boolean; 
  sourceEmailId?: string; 
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

export interface Habit {
  id: string;
  title: string;
  streak: number;
  completedDays: string[]; 
}
