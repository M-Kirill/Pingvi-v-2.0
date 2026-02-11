import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { authService } from './auth';

export interface UserProfile {
  id: number;
  telegram_id: number;
  first_name: string;
  login: string;
  coins: number;
  photo_url?: string;
  created_at: string;
  last_login?: string;
  role: string;
}

export interface FamilyMember {
  id: number;
  name: string;
  child_name?: string;
  age?: number;
  coins: number;
  avatar_url?: string;
  created_at: string;
}

export interface ProfileData {
  user: UserProfile;
  children: FamilyMember[];
  tasks_count: number;
  total_coins: number;
}

class ProfileService {
  async getProfile(): Promise<ProfileData | null> {
    try {
      const response = await api.get<{success: boolean; profile: ProfileData}>('/api/profile');
      
      if (response.success && response.profile) {
        await this.syncLocalData(response.profile);
        return response.profile;
      }
    } catch (error) {
      console.error('Ошибка получения профиля:', error);
    }

    return null;
  }

  async getFamily(): Promise<FamilyMember[]> {
    try {
      const response = await api.get<{success: boolean; family: FamilyMember[]}>('/api/family');
      
      if (response.success && response.family) {
        return response.family;
      }
    } catch (error) {
      console.error('Ошибка получения семьи:', error);
    }

    return [];
  }

  async getChildren(): Promise<FamilyMember[]> {
    try {
      const response = await api.get<{success: boolean; children: FamilyMember[]}>('/api/users/children');
      
      if (response.success && response.children) {
        return response.children;
      }
    } catch (error) {
      console.error('Ошибка получения детей:', error);
    }

    return [];
  }

  async createChild(name: string, age?: number): Promise<{success: boolean; message: string; child_id?: number}> {
    try {
      const response = await api.post<{
        success: boolean;
        message: string;
        child_name: string;
        child_id?: number;
      }>('/api/children/create', { name, age });
      
      return {
        success: response.success,
        message: response.message,
        child_id: response.child_id
      };
    } catch (error: any) {
      console.error('Ошибка создания ребенка:', error);
      return {
        success: false,
        message: error.message || 'Ошибка сети'
      };
    }
  }

  async updateProfile(data: {first_name?: string; photo_url?: string}): Promise<boolean> {
    try {
      const response = await api.patch<{success: boolean; message: string}>('/api/profile', data);
      return response.success;
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
      return false;
    }
  }

  async syncLocalData(profile: ProfileData): Promise<void> {
    try {
      // Сохраняем профиль в AsyncStorage для оффлайн работы
      await AsyncStorage.setItem('current_user', JSON.stringify({
        id: profile.user.id,
        login: profile.user.login,
        name: profile.user.first_name,
        coins: profile.user.coins,
        photoUrl: profile.user.photo_url,
        familyMembers: profile.children,
        telegramAuth: !!profile.user.telegram_id,
        createdAt: profile.user.created_at,
        hasProfilePhoto: !!profile.user.photo_url,
        profileCompleted: true,
        preferences: {
          notifications: true,
          theme: 'light'
        }
      }));

      await AsyncStorage.setItem('user_type', profile.user.role);
      await AsyncStorage.setItem('is_authenticated', 'true');
      
      // Сохраняем детей отдельно
      await AsyncStorage.setItem('user_children', JSON.stringify(profile.children));
    } catch (error) {
      console.error('Ошибка синхронизации данных:', error);
    }
  }

  async getCachedProfile(): Promise<any> {
    try {
      const userJson = await AsyncStorage.getItem('current_user');
      if (userJson) {
        return JSON.parse(userJson);
      }
    } catch (error) {
      console.error('Ошибка получения кэшированного профиля:', error);
    }
    return null;
  }

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem('current_user');
      await AsyncStorage.removeItem('user_children');
      await AsyncStorage.removeItem('user_type');
    } catch (error) {
      console.error('Ошибка очистки кэша:', error);
    }
  }
}

export const profileService = new ProfileService();