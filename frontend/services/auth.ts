import { api, AuthResponse, User, ApiResponse } from './api';

export interface LoginCredentials {
  login: string;
  password: string;
  device_info?: string;
}

export interface RegisterData {
  telegram_id: number;
  first_name: string;
}

class AuthService {
  
  /**
   * Вход в приложение
   */
  async login(login: string, password: string, deviceInfo: string = 'Mobile App'): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/api/auth/login', {
        login,
        password,
        device_info: deviceInfo,
      }, true); // skipAuth = true

      if (response.success && response.token && response.user) {
        await api.setAuth(response.token, response.user);
        
        // Сразу загружаем профиль
        try {
          await this.loadProfile();
        } catch (profileError) {
          console.warn('⚠️ Не удалось загрузить профиль при входе:', profileError);
        }
      }

      return response;
    } catch (error: any) {
      console.error('❌ AuthService.login error:', error);
      
      return {
        success: false,
        message: error.message || 'Ошибка авторизации',
      };
    }
  }

  /**
   * Регистрация через Telegram
   */
  async registerViaTelegram(telegramId: number, firstName: string): Promise<AuthResponse> {
    try {
      const response = await api.post<ApiResponse & { 
        login: string; 
        password?: string;
        user_id: number;
      }>('/api/users/register', {
        telegram_id: telegramId,
        first_name: firstName,
      }, true);

      if (response.success) {
        // Если пользователь уже существовал, получаем токен
        if (!response.password) {
          // Пробуем войти с существующим логином
          return this.login(response.login, '');
        }
        
        return {
          success: true,
          message: response.message || 'Регистрация успешна',
          user: {
            id: response.user_id,
            telegram_id: telegramId,
            first_name: firstName,
            login: response.login,
            role: 'parent',
            coins: 5000,
          },
          token: '', // Токен будет получен при входе
        };
      }

      return {
        success: false,
        message: response.message || 'Ошибка регистрации',
      };
    } catch (error: any) {
      console.error('❌ AuthService.register error:', error);
      return {
        success: false,
        message: error.message || 'Ошибка регистрации',
      };
    }
  }

  /**
   * Загрузка профиля пользователя
   */
  async loadProfile(): Promise<any> {
    try {
      const response = await api.get('/api/users/profile');
      
      if (response.success && response.profile) {
        await api.saveProfile(response.profile);
        return response.profile;
      }
      
      return null;
    } catch (error) {
      console.error('❌ AuthService.loadProfile error:', error);
      return null;
    }
  }

  /**
   * Выход из системы
   */
  async logout(): Promise<boolean> {
    try {
      const token = await api.getAuthToken();
      
      if (token) {
        // Пытаемся завершить сессию на сервере
        await api.post('/api/auth/logout', {}).catch(() => {});
      }
      
      await api.clearAuth();
      return true;
    } catch (error) {
      console.error('❌ AuthService.logout error:', error);
      await api.clearAuth(); // Всё равно очищаем локальные данные
      return false;
    }
  }

  /**
   * Проверка валидности токена
   */
  async validateToken(): Promise<boolean> {
    try {
      const response = await api.get('/api/auth/validate');
      return response.valid === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Получение текущего пользователя
   */
  async getCurrentUser(): Promise<User | null> {
    return api.getUser();
  }

  /**
   * Проверка авторизации
   */
  async isAuthenticated(): Promise<boolean> {
    return api.isAuthenticated();
  }

  /**
   * Тестирование соединения
   */
  async testConnection(url?: string): Promise<boolean> {
    try {
      const testUrl = url || api.getCurrentUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${testUrl}/api/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return data.status === 'healthy';
      }
      
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Автоматическое обнаружение API URL
   */
  async discoverApiUrl(): Promise<string> {
    return api.discoverApiUrl();
  }

  /**
   * Установка URL API
   */
  async setApiUrl(url: string): Promise<void> {
    await api.setBaseUrl(url);
  }

  /**
   * Получение текущего URL
   */
  getCurrentApiUrl(): string {
    return api.getCurrentUrl();
  }
}

export const authService = new AuthService();