import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

export interface User {
  id: number;
  telegram_id: number | null;
  first_name: string;
  login: string;
  role: string;
  coins: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
  expires_at?: string;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  async login(login: string, password: string, deviceInfo: string = ''): Promise<AuthResponse> {
    try {
      console.log(`🔐 Авторизация: ${login}`);
      
      const response = await api.post<AuthResponse>('/api/auth/login', {
        login,
        password,
        device_info: deviceInfo || `Mobile App`
      });

      if (response.success && response.token && response.user) {
        this.token = response.token;
        this.user = response.user;
        
        await AsyncStorage.setItem('auth_token', response.token);
        await AsyncStorage.setItem('auth_user', JSON.stringify(response.user));
        
        console.log('✅ Авторизация успешна');
        return response;
      } else {
        throw new Error(response.message || 'Ошибка авторизации');
      }
    } catch (error: any) {
      console.error('❌ Ошибка входа:', error);
      return {
        success: false,
        message: error.message || 'Ошибка сети',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      const token = await this.getToken();
      if (token) {
        await api.post('/api/auth/logout', {});
      }
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
    
    this.token = null;
    this.user = null;
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
  }

  async getToken(): Promise<string | null> {
    if (this.token) return this.token;
    
    try {
      this.token = await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Ошибка получения токена:', error);
    }
    
    return this.token;
  }

  async getUser(): Promise<User | null> {
    if (this.user) return this.user;
    
    try {
      const userJson = await AsyncStorage.getItem('auth_user');
      if (userJson) {
        this.user = JSON.parse(userJson);
      }
    } catch (error) {
      console.error('Ошибка получения пользователя:', error);
    }
    
    return this.user;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;

    try {
      const response = await api.get<any>('/api/auth/validate');
      return response.valid === true;
    } catch (error) {
      console.error('Ошибка проверки аутентификации:', error);
      return false;
    }
  }

  async refreshToken(): Promise<AuthResponse | null> {
    try {
      const token = await this.getToken();
      if (!token) return null;

      const response = await api.post<AuthResponse>('/api/auth/refresh', {});
      
      if (response.success && response.token) {
        this.token = response.token;
        await AsyncStorage.setItem('auth_token', response.token);
        console.log('✅ Токен обновлен');
        return response;
      }
    } catch (error) {
      console.error('Ошибка обновления токена:', error);
    }
    
    return null;
  }

  // Добавляем заголовок авторизации для запросов
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
}

export const authService = new AuthService();