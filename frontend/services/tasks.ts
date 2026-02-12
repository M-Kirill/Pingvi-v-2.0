import { api, Task, ApiResponse } from './api';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';
export type TaskType = 'personal' | 'child';

export interface CreateTaskData {
  title: string;
  description: string;
  type: TaskType;
  coins: number;
  start_date: string;
  end_date: string;
  is_repeating?: boolean;
  child_id?: number;
}

export interface UpdateTaskData {
  status?: TaskStatus;
  title?: string;
  description?: string;
}

class TaskService {
  
  /**
   * Получение всех задач
   */
  async getTasks(type?: TaskType, status?: TaskStatus, date?: string): Promise<Task[]> {
    try {
      let url = '/api/tasks';
      const params = new URLSearchParams();
      
      if (type) params.append('type', type);
      if (status) params.append('status', status);
      if (date) params.append('date', date);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await api.get<{ success: boolean; tasks: Task[] }>(url);
      return response.success ? response.tasks : [];
    } catch (error) {
      console.error('❌ TaskService.getTasks error:', error);
      return [];
    }
  }

  /**
   * Получение задач на конкретную дату
   */
  async getTasksForDate(date: Date): Promise<Task[]> {
    const dateStr = date.toISOString().split('T')[0];
    return this.getTasks(undefined, undefined, dateStr);
  }

  /**
   * Создание задачи
   */
  async createTask(taskData: CreateTaskData): Promise<{ success: boolean; task?: Task; task_id?: number; message?: string }> {
    try {
      const response = await api.post<{
        success: boolean;
        message: string;
        task_id: number;
        task: Task;
      }>('/api/tasks', taskData);

      return {
        success: response.success,
        task: response.task,
        task_id: response.task_id,
        message: response.message,
      };
    } catch (error: any) {
      console.error('❌ TaskService.createTask error:', error);
      return {
        success: false,
        message: error.message || 'Ошибка создания задачи',
      };
    }
  }

  /**
   * Обновление статуса задачи
   */
  async updateTaskStatus(taskId: number, status: TaskStatus): Promise<boolean> {
    try {
      const response = await api.patch<ApiResponse>(`/api/tasks/${taskId}`, { status });
      return response.success;
    } catch (error) {
      console.error('❌ TaskService.updateTaskStatus error:', error);
      return false;
    }
  }

  /**
   * Обновление задачи
   */
  async updateTask(taskId: number, data: UpdateTaskData): Promise<boolean> {
    try {
      const response = await api.patch<ApiResponse>(`/api/tasks/${taskId}`, data);
      return response.success;
    } catch (error) {
      console.error('❌ TaskService.updateTask error:', error);
      return false;
    }
  }

  /**
   * Завершение задачи
   */
  async completeTask(taskId: number): Promise<{ success: boolean; coins?: number; message?: string }> {
    try {
      const response = await api.patch<ApiResponse & { message: string }>(
        `/api/tasks/${taskId}`, 
        { status: 'completed' }
      );
      
      // Извлекаем количество монет из сообщения
      const coinsMatch = response.message?.match(/(\d+)/);
      const coins = coinsMatch ? parseInt(coinsMatch[0]) : undefined;
      
      return {
        success: response.success,
        coins,
        message: response.message,
      };
    } catch (error) {
      console.error('❌ TaskService.completeTask error:', error);
      return { success: false };
    }
  }

  /**
   * Удаление задачи
   */
  async deleteTask(taskId: number): Promise<boolean> {
    try {
      const response = await api.delete<ApiResponse>(`/api/tasks/${taskId}`);
      return response.success;
    } catch (error) {
      console.error('❌ TaskService.deleteTask error:', error);
      return false;
    }
  }

  /**
   * Получение задачи по ID
   */
  async getTaskById(taskId: number): Promise<Task | null> {
    try {
      const tasks = await this.getTasks();
      return tasks.find(t => t.id === taskId) || null;
    } catch (error) {
      console.error('❌ TaskService.getTaskById error:', error);
      return null;
    }
  }

  /**
   * Подсчет статистики задач
   */
  calculateTaskStats(tasks: Task[]): {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    cancelled: number;
    totalCoins: number;
  } {
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      totalCoins: tasks.reduce((sum, t) => sum + (t.status === 'completed' ? t.coins : 0), 0),
    };
  }
}

export const taskService = new TaskService();