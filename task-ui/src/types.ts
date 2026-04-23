export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  dueDate?: string | null;
  category?: string | null;
}

export type CompletionFilter = 'all' | 'incomplete' | 'complete';
