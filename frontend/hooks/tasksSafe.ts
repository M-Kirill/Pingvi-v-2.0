import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const API_BASE_URL = "http://192.168.50.171:8000";

export type TaskStatus = 'todo' | 'in-progress' | 'completed';

export interface Task {
  id: string | number;
  title: string;
  description: string;
  status: TaskStatus;
  type: 'child' | 'self';
  startDate: string;
  endDate: string;
  coins: number;
  isRepeating: boolean;
  childName?: string;
  createdAt: string;
  updatedAt: string;
}

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const getAuthToken = async (): Promise<string | null> => {
    return await AsyncStorage.getItem('auth_token');
  };

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Не авторизован');
      }

      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки задач');
      }

      const data = await response.json();
      const tasksData = data.tasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        type: task.type,
        startDate: task.start_date,
        endDate: task.end_date,
        coins: task.coins,
        isRepeating: task.is_repeating,
        childName: task.child_name,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
      }));

      setTasks(tasksData);
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
      // Если API недоступно, используем локальные данные
      const localTasks = await AsyncStorage.getItem('tasks');
      if (localTasks) {
        setTasks(JSON.parse(localTasks));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const addTask = async (taskData: Omit<Task, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        // Сохраняем локально если нет токена
        const newTask: Task = {
          id: Date.now().toString(),
          ...taskData,
          status: 'todo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        const updatedTasks = [...tasks, newTask];
        setTasks(updatedTasks);
        await AsyncStorage.setItem('tasks', JSON.stringify(updatedTasks));
        return newTask;
      }

      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: taskData.title,
          description: taskData.description,
          type: taskData.type,
          coins: taskData.coins,
          start_date: taskData.startDate,
          end_date: taskData.endDate,
          is_repeating: taskData.isRepeating,
          child_name: taskData.childName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка создания задачи');
      }

      const data = await response.json();
      const newTask = {
        id: data.task.id,
        title: data.task.title,
        description: data.task.description,
        status: data.task.status,
        type: data.task.type,
        startDate: data.task.start_date,
        endDate: data.task.end_date,
        coins: data.task.coins,
        isRepeating: data.task.is_repeating,
        childName: data.task.child_name,
        createdAt: data.task.created_at,
        updatedAt: data.task.updated_at,
      };

      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
      return newTask;
    } catch (error: any) {
      console.error('Ошибка создания задачи:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось создать задачу');
      throw error;
    }
  };

  const updateTaskStatus = async (taskId: string | number, newStatus: TaskStatus) => {
    try {
      console.log(`Обновление статуса задачи: ID=${taskId}, новый статус=${newStatus}`);
      
      // Нормализуем ID - преобразуем в число для сравнения
      const taskIdNum = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
      
      // Ищем задачу с учетом разных форматов ID
      const taskToUpdate = tasks.find(task => {
        const taskIdNumLocal = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
        return taskIdNumLocal === taskIdNum || task.id === taskId || task.id.toString() === taskId.toString();
      });
      
      if (!taskToUpdate) {
        console.warn(`Задача ${taskId} не найдена в локальном кэше. Продолжаем обновление на сервере.`);
      }
      
      // 1. ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ - сразу меняем в UI
      const updatedTasks = tasks.map(task => {
        const taskIdNumLocal = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
        const isSameTask = taskIdNumLocal === taskIdNum || task.id === taskId || task.id.toString() === taskId.toString();
        
        return isSameTask 
          ? { 
              ...task, 
              status: newStatus, 
              updatedAt: new Date().toISOString() 
            } 
          : task;
      });
      
      setTasks(updatedTasks);
      
      // 2. Сохраняем локально для offline работы
      await AsyncStorage.setItem('tasks', JSON.stringify(updatedTasks));
      
      const token = await getAuthToken();
      if (!token) {
        console.log('Обновление статуса только локально:', taskId, '->', newStatus);
        return;
      }

      // 3. Отправляем на сервер - используем числовой ID для API
      console.log(`Отправка на сервер: /api/tasks/${taskIdNum}`);
      
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskIdNum}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ошибка от сервера:', response.status, errorText);
        
        if (response.status === 404) {
          throw new Error(`Задача с ID ${taskIdNum} не найдена на сервере`);
        }
        
        throw new Error('Ошибка обновления статуса на сервере');
      }

      const data = await response.json();
      console.log('Статус обновлен успешно на сервере:', data);
      
      // 4. Обновляем с сервера для синхронизации
      try {
        const refreshedResponse = await fetch(`${API_BASE_URL}/api/tasks/${taskIdNum}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (refreshedResponse.ok) {
          const refreshedTask = await refreshedResponse.json();
          const tasksWithUpdated = tasks.map(task => {
            const taskIdNumLocal = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
            const isSameTask = taskIdNumLocal === taskIdNum || task.id === taskId || task.id.toString() === taskId.toString();
            
            return isSameTask 
              ? { 
                  ...task, 
                  status: refreshedTask.status,
                  updatedAt: refreshedTask.updated_at
                } 
              : task;
          });
          setTasks(tasksWithUpdated);
        }
      } catch (syncError) {
        console.warn('Не удалось синхронизировать с сервером:', syncError);
      }
      
      if (newStatus === 'completed') {
        setTimeout(() => {
          Alert.alert('Успех!', data.message || 'Задача выполнена!');
        }, 300);
      }
      
    } catch (error: any) {
      console.error('Ошибка обновления статуса:', error);
      // Перезагружаем актуальные данные
      await loadTasks();
      Alert.alert('Ошибка', error.message || 'Не удалось изменить статус задачи');
    }
  };

  const deleteTask = async (taskId: string | number): Promise<boolean> => {
    try {
      // Нормализуем ID
      const taskIdNum = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
      
      // Оптимистичное удаление
      const updatedTasks = tasks.filter(task => {
        const taskIdNumLocal = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
        return !(taskIdNumLocal === taskIdNum || task.id === taskId || task.id.toString() === taskId.toString());
      });
      
      setTasks(updatedTasks);
      await AsyncStorage.setItem('tasks', JSON.stringify(updatedTasks));
      
      const token = await getAuthToken();
      if (!token) {
        return true; // Удалено локально
      }

      console.log(`Удаление задачи на сервере: ID=${taskIdNum}`);
      
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskIdNum}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Если ошибка на сервере - восстанавливаем задачу
        await loadTasks();
        throw new Error('Ошибка удаления задачи');
      }

      return true;
    } catch (error: any) {
      console.error('Ошибка удаления задачи:', error);
      await loadTasks(); // Восстанавливаем актуальные данные
      Alert.alert('Ошибка', error.message || 'Не удалось удалить задачу');
      return false;
    }
  };

  const getTasksByDateAndType = useCallback((date: Date, type?: 'child' | 'self' | 'all') => {
    const selectedDate = date.toISOString().split('T')[0];
    
    return tasks.filter(task => {
      const taskStartDate = task.startDate.split('T')[0];
      const taskEndDate = task.endDate.split('T')[0];
      
      // Проверяем, что задача активна в выбранную дату
      const isInDateRange = selectedDate >= taskStartDate && selectedDate <= taskEndDate;
      
      // Проверяем тип задачи
      if (type && type !== 'all') {
        return isInDateRange && task.type === type;
      }
      
      return isInDateRange;
    });
  }, [tasks]);

  // Загружаем задачи при монтировании
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // ДОБАВЛЯЕМ ИНТЕРВАЛЬНУЮ СИНХРОНИЗАЦИЮ
  useEffect(() => {
    const syncInterval = setInterval(() => {
      loadTasks();
    }, 30000); // Синхронизация каждые 30 секунд

    return () => clearInterval(syncInterval);
  }, [loadTasks]);

  return {
    tasks,
    loading,
    loadTasks,
    addTask,
    updateTaskStatus,
    deleteTask,
    getTasksByDateAndType,
  };
};