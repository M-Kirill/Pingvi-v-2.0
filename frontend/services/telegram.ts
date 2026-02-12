import { useState, useEffect, useCallback } from 'react';
import { taskService, Task, TaskStatus, TaskType, CreateTaskData } from '../services/tasks';
import { profileService } from '../services/profile';

export type { TaskStatus, TaskType };

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка задач
  const loadTasks = useCallback(async (type?: TaskType, status?: TaskStatus) => {
    try {
      setLoading(true);
      setError(null);
      
      const loadedTasks = await taskService.getTasks(type, status);
      setTasks(loadedTasks);
      
      return loadedTasks;
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки задач');
      console.error('❌ loadTasks error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Загрузка задач на дату
  const loadTasksForDate = useCallback(async (date: Date) => {
    try {
      setLoading(true);
      setError(null);
      
      const loadedTasks = await taskService.getTasksForDate(date);
      setTasks(loadedTasks);
      
      return loadedTasks;
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки задач');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Добавление задачи
  const addTask = useCallback(async (taskData: CreateTaskData) => {
    try {
      const result = await taskService.createTask(taskData);
      
      if (result.success && result.task) {
        setTasks(prev => [result.task!, ...prev]);
        return true;
      }
      
      return false;
    } catch (err: any) {
      console.error('❌ addTask error:', err);
      return false;
    }
  }, []);

  // Обновление статуса задачи
  const updateTaskStatus = useCallback(async (taskId: string | number, newStatus: TaskStatus) => {
    try {
      const id = typeof taskId === 'string' ? parseInt(taskId) : taskId;
      
      // Оптимистичное обновление
      setTasks(prev => prev.map(task => 
        task.id === id ? { ...task, status: newStatus } : task
      ));
      
      const success = await taskService.updateTaskStatus(id, newStatus);
      
      if (!success) {
        // Откатываем изменения при ошибке
        setTasks(prev => [...prev]);
        return false;
      }
      
      return true;
    } catch (err: any) {
      console.error('❌ updateTaskStatus error:', err);
      // Откатываем изменения
      setTasks(prev => [...prev]);
      return false;
    }
  }, []);

  // Завершение задачи
  const completeTask = useCallback(async (taskId: string | number) => {
    try {
      const id = typeof taskId === 'string' ? parseInt(taskId) : taskId;
      
      const result = await taskService.completeTask(id);
      
      if (result.success) {
        // Обновляем локальное состояние
        setTasks(prev => prev.map(task => 
          task.id === id ? { ...task, status: 'completed' } : task
        ));
        
        return result;
      }
      
      return { success: false };
    } catch (err: any) {
      console.error('❌ completeTask error:', err);
      return { success: false };
    }
  }, []);

  // Удаление задачи
  const deleteTask = useCallback(async (taskId: string | number) => {
    try {
      const id = typeof taskId === 'string' ? parseInt(taskId) : taskId;
      
      // Оптимистичное удаление
      setTasks(prev => prev.filter(task => task.id !== id));
      
      const success = await taskService.deleteTask(id);
      
      if (!success) {
        // При ошибке загружаем актуальный список
        await loadTasks();
        return false;
      }
      
      return true;
    } catch (err: any) {
      console.error('❌ deleteTask error:', err);
      await loadTasks();
      return false;
    }
  }, [loadTasks]);

  // Получение задач по дате и типу
  const getTasksByDateAndType = useCallback((date: Date, type?: TaskType) => {
    const dateStr = date.toISOString().split('T')[0];
    
    return tasks.filter(task => {
      // Проверяем, попадает ли задача на выбранную дату
      const taskStart = task.start_date.split('T')[0];
      const taskEnd = task.end_date.split('T')[0];
      
      const isInDateRange = dateStr >= taskStart && dateStr <= taskEnd;
      
      if (!isInDateRange) return false;
      
      if (type) {
        return task.type === type;
      }
      
      return true;
    });
  }, [tasks]);

  // Подсчет статистики
  const getStats = useCallback(() => {
    return taskService.calculateTaskStats(tasks);
  }, [tasks]);

  // Очистка ошибки
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Загружаем задачи при монтировании
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return {
    tasks,
    loading,
    error,
    loadTasks,
    loadTasksForDate,
    addTask,
    updateTaskStatus,
    completeTask,
    deleteTask,
    getTasksByDateAndType,
    getStats,
    clearError,
  };
}