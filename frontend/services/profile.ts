import { api, User, Child, Profile, ApiResponse } from './api';

export interface UpdateProfileData {
  first_name?: string;
  photo_url?: string | null;
}

class ProfileService {
  
  /**
   * Получение полного профиля пользователя
   */
  async getProfile(forceRefresh: boolean = false): Promise<Profile | null> {
    try {
      // Сначала пробуем получить из кэша
      if (!forceRefresh) {
        const cached = await api.getSavedProfile();
        if (cached) {
          console.log('📦 Используем кэшированный профиль');
          return cached;
        }
      }

      console.log('📡 Загружаем профиль с сервера...');
      const response = await api.get<{ success: boolean; profile: Profile }>('/api/users/profile');
      
      if (response.success && response.profile) {
        await api.saveProfile(response.profile);
        return response.profile;
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ ProfileService.getProfile error:', error);
      
      // При ошибке пробуем вернуть кэшированные данные
      const cached = await api.getSavedProfile();
      if (cached) {
        console.log('⚠️ Используем кэшированный профиль из-за ошибки');
        return cached;
      }
      
      throw error;
    }
  }

  /**
   * Обновление профиля
   */
  async updateProfile(data: UpdateProfileData): Promise<boolean> {
    try {
      const response = await api.patch<ApiResponse>('/api/users/profile', data);
      
      if (response.success) {
        // Обновляем кэш
        await this.getProfile(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ ProfileService.updateProfile error:', error);
      return false;
    }
  }

  /**
   * Получение списка детей
   */
  async getChildren(): Promise<Child[]> {
    try {
      const response = await api.get<{ success: boolean; children: Child[] }>('/api/users/children');
      return response.success ? response.children : [];
    } catch (error) {
      console.error('❌ ProfileService.getChildren error:', error);
      return [];
    }
  }

  /**
   * Получение членов семьи
   */
  async getFamily(): Promise<any[]> {
    try {
      const response = await api.get<{ success: boolean; family: any[] }>('/api/family');
      return response.success ? response.family : [];
    } catch (error) {
      console.error('❌ ProfileService.getFamily error:', error);
      return [];
    }
  }

  /**
   * Создание ребенка
   */
  async createChild(name: string, age?: number): Promise<{ success: boolean; child_id?: number; message?: string }> {
    try {
      const response = await api.post<{
        success: boolean;
        message: string;
        child_id?: number;
        child_name: string;
      }>('/api/children/create', { name, age });

      if (response.success) {
        // Обновляем профиль, чтобы получить нового ребенка
        await this.getProfile(true);
      }

      return {
        success: response.success,
        child_id: response.child_id,
        message: response.message,
      };
    } catch (error: any) {
      console.error('❌ ProfileService.createChild error:', error);
      return {
        success: false,
        message: error.message || 'Ошибка создания ребенка',
      };
    }
  }

  /**
   * Синхронизация локальных данных с сервером
   */
  async syncLocalData(profile: Profile): Promise<void> {
    await api.saveProfile(profile);
  }

  /**
   * Получение статистики
   */
  async getStatistics(): Promise<any> {
    try {
      const profile = await this.getProfile();
      if (!profile) return null;

      return {
        total_coins: profile.total_coins,
        family_coins: profile.family_coins,
        tasks_count: profile.tasks_count,
        completed_tasks: profile.completed_tasks,
        children_count: profile.children_count,
        completion_rate: profile.tasks_count > 0 
          ? Math.round((profile.completed_tasks / profile.tasks_count) * 100) 
          : 0,
      };
    } catch (error) {
      console.error('❌ ProfileService.getStatistics error:', error);
      return null;
    }
  }
}

export const profileService = new ProfileService();