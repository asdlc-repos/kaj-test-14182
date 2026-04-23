import axios from 'axios';
import type { Task, TaskInput } from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:9090';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchTasks(params: {
  category?: string;
  completed?: boolean;
}): Promise<Task[]> {
  const query: Record<string, string> = {};
  if (params.category) query.category = params.category;
  if (params.completed !== undefined) query.completed = String(params.completed);
  const response = await client.get<Task[]>('/tasks', { params: query });
  return response.data;
}

export async function createTask(input: TaskInput): Promise<Task> {
  const response = await client.post<Task>('/tasks', input);
  return response.data;
}

export async function updateTask(id: string, input: TaskInput): Promise<Task> {
  const response = await client.put<Task>(`/tasks/${id}`, input);
  return response.data;
}

export async function deleteTask(id: string): Promise<void> {
  await client.delete(`/tasks/${id}`);
}

export async function toggleTaskComplete(id: string, completed: boolean): Promise<Task> {
  const response = await client.patch<Task>(`/tasks/${id}/complete`, { completed });
  return response.data;
}

export async function fetchCategories(): Promise<string[]> {
  const response = await client.get<string[]>('/categories');
  return response.data;
}
