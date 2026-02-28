
export type ViewType = 'today' | 'inbox' | 'planner' | 'schedule' | 'metrics' | 'habits' | 'settings' | 'project-detail' | 'task-view' | 'customer-view';

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
  workflowAnswers?: WorkflowState;
  timerStartedAt?: string;
  timerStoppedAt?: string;
  assignees?: string[];
}

export interface WorkflowStep {
  stepId: string;
  question: string;
  options: string[];
  allowFreeText?: boolean;
}

export interface WorkflowTemplate {
  category: string;
  steps: WorkflowStep[];
}

export interface WorkflowAnswer {
  stepId: string;
  question: string;
  answer: string;
  answeredAt: string;
}

export interface WorkflowState {
  category: string;
  steps: WorkflowAnswer[];
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
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  time?: string;        // HH:mm format
  dayOfWeek?: number;   // 0=Sun, 1=Mon, ..., 6=Sat (for weekly)
  dayOfMonth?: number;  // 1-31 (for monthly)
  monthOfYear?: number; // 1-12 (for yearly)
  estimatedMinutes?: number;
  customerName?: string;
  projectName?: string;
}
