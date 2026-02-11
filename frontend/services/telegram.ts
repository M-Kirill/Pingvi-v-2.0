import { api } from './api';

export interface ChildData {
  name: string;
  age?: number;
  login: string;
  coins: number;
}

export interface TelegramUserData {
  id: number;
  telegram_id: number;
  first_name: string;
  login: string;
  coins: number;
  role: string;
}

class TelegramService {
  async getChildData(telegramId: number): Promise<{success: boolean; has_children: boolean; message: string; children: ChildData[]}> {
    try {
      const response = await api.get<{
        success: boolean;
        has_children: boolean;
        message: string;
        children: ChildData[];
      }>(`/api/telegram/child-data/${telegramId}`);
      
      return response;
    } catch (error: any) {
      console.error('Ошибка получения данных ребенка:', error);
      return {
        success: false,
        has_children: false,
        message: error.message || 'Ошибка сети',
        children: []
      };
    }
  }

  async getUserData(telegramId: number): Promise<{success: boolean; user?: TelegramUserData; children_count: number}> {
    try {
      const response = await api.get<{
        success: boolean;
        user: TelegramUserData;
        children_count: number;
      }>(`/api/telegram/user-data/${telegramId}`);
      
      return response;
    } catch (error: any) {
      console.error('Ошибка получения данных пользователя:', error);
      return {
        success: false,
        children_count: 0
      };
    }
  }

  async registerUser(telegramId: number, firstName: string, login?: string, password?: string): Promise<{
    success: boolean;
    message: string;
    user_id?: number;
    login?: string;
    password?: string;
  }> {
    try {
      const response = await api.post<{
        success: boolean;
        message: string;
        user_id?: number;
        login?: string;
        password?: string;
      }>('/api/users/register', {
        telegram_id: telegramId,
        first_name: firstName,
        login,
        password
      });
      
      return response;
    } catch (error: any) {
      console.error('Ошибка регистрации пользователя:', error);
      return {
        success: false,
        message: error.message || 'Ошибка сети'
      };
    }
  }
}

export const telegramService = new TelegramService();