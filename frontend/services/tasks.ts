import { api } from './api';

export interface Task {
  id: number;
  title: string;
  description: string;
  type: 'personal' | 'child' | 'family';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  coins: number;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  assigned_to_id?: number;
  assigned_to_name?: string;
  user_id: number;
  is_repeating: boolean;
}

export interface CreateTaskData {
  title: string;
  description: string;
  type: 'personal' | 'child' | 'family';
  coins: number;
  start_date: string;
  end_date: string;
  child_id?: number;
  is_repeating: boolean;
}

export interface UpdateTaskData {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  title?: string;
  description?: string;
}

class TaskService {
  async getTasks(type?: string, status?: string): Promise<Task[]> {
    try {
      let endpoint = '/api/tasks';
      const params = [];
      
      if (type) params.push(`type=${type}`);
      if (status) params.push(`status=${status}`);
      
      if (params.length > 0) {
        endpoint += `?${params.join('&')}`;
      }
      
      const response = await api.get<{success: boolean; tasks: Task[]}>(endpoint);
      
      if (response.success && response.tasks) {
        return response.tasks;
      }
    } catch (error) {
      console.error('Ошибка получения задач:', error);
    }

    return [];
  }

  async createTask(data: CreateTaskData): Promise<{success: boolean; task_id?: number; message: string}> {
    try {
      const response = await api.post<{
        success: boolean;
        message: string;
        task_id?: number;
        task?: Task;
      }>('/api/tasks', data);
      
      return {
        success: response.success,
        task_id: response.task_id,
        message: response.message
      };
    } catch (error: any) {
      console.error('Ошибка создания задачи:', error);
      return {
        success: false,
        message: error.message || 'Ошибка сети'
      };
    }
  }

  async updateTask(taskId: number, data: UpdateTaskData): Promise<boolean> {
    try {
      const response = await api.patch<{success: boolean; message: string}>(`/api/tasks/${taskId}`, data);
      return response.success;
    } catch (error) {
      console.error('Ошибка обновления задачи:', error);
      return false;
    }
  }

  async deleteTask(taskId: number): Promise<boolean> {
    try {
      const response = await api.delete<{success: boolean; message: string}>(`/api/tasks/${taskId}`);
      return response.success;
    } catch (error) {
      console.error('Ошибка удаления задачи:', error);
      return false;
    }
  }

  async completeTask(taskId: number): Promise<boolean> {
    return this.updateTask(taskId, { status: 'completed' });
  }

  async getTaskById(taskId: number): Promise<Task | null> {
    try {
      // Если у вас есть endpoint для получения одной задачи
      const response = await api.get<{success: boolean; task: Task}>(`/api/tasks/${taskId}`);
      
      if (response.success && response.task) {
        return response.task;
      }
    } catch (error) {
      console.error('Ошибка получения задачи:', error);
    }

    return null;
  }
}

export const taskService = new TaskService();