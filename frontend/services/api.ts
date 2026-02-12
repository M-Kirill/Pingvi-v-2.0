import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Типы для ответов API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
  expires_at?: string;
}

export interface User {
  id: number;
  telegram_id?: number | null;
  first_name: string;
  login: string;
  role: 'parent' | 'child';
  coins: number;
  photo_url?: string | null;
  created_at?: string;
  last_login?: string;
}

export interface Child {
  id: number;
  first_name: string;
  child_name: string;
  login: string;
  coins: number;
  age?: number;
  relationship?: string;
  created_at?: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  type: 'personal' | 'child';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  coins: number;
  start_date: string;
  end_date: string;
  is_repeating: boolean;
  created_at: string;
  updated_at: string;
  user_id: number;
  assigned_to_id?: number;
  assigned_to_name?: string;
}

export interface Profile {
  user: User;
  children: Child[];
  tasks_count: number;
  completed_tasks: number;
  total_coins: number;
  family_coins: number;
  children_count: number;
}

// Ключи для AsyncStorage
const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  AUTH_USER: 'auth_user',
  API_URL: 'api_url',
  PROFILE: 'user_profile',
} as const;

class ApiService {
  private baseUrl: string = 'http://localhost:8080';
  private readonly DEFAULT_PORT = 8080;

  constructor() {
    this.loadSavedUrl();
  }

  // ========== URL Management ==========

  private async loadSavedUrl() {
    try {
      const savedUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_URL);
      if (savedUrl) {
        this.baseUrl = savedUrl;
        console.log('📡 Загружен сохраненный URL:', this.baseUrl);
      } else {
        // Автоматически определяем URL при первом запуске
        this.discoverApiUrl();
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки URL:', error);
    }
  }

  async discoverApiUrl(): Promise<string> {
    // Список URL для проверки
    const urlsToTry = [
      // Cloudflare URL (если доступен)
      ...(await this.getCloudflareUrl() ? [await this.getCloudflareUrl()] : []),
      
      // Локальные адреса
      'https://michael-unpatched-aleah.ngrok-free.dev',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'http://10.0.2.2:8080', // Android эмулятор
      'http://192.168.0.30:8080', // Ваш текущий IP
      
      // Сетевые адреса (будут добавлены динамически)
      ...(await this.getLocalNetworkIps()),
    ].filter(Boolean) as string[];

    console.log('🔍 Проверяем доступные API URL:', urlsToTry);

    for (const url of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${url}/api/health`, {
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'healthy') {
            console.log('✅ Найден рабочий API URL:', url);
            await this.setBaseUrl(url);
            return url;
          }
        }
      } catch (error) {
        console.log(`❌ URL ${url} недоступен`);
      }
    }

    // Если ничего не нашли, используем localhost
    console.log('⚠️ Не удалось найти API, используем localhost');
    return this.baseUrl;
  }

  private async getCloudflareUrl(): Promise<string | null> {
    try {
      // Сначала пробуем получить конфигурацию с локального сервера
      const response = await fetch('http://localhost:8080/api/mobile-config', {
        timeout: 2000,
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.CLOUDFLARE_URL || null;
      }
    } catch (error) {
      // Пробуем другие локальные адреса
      try {
        const response = await fetch('http://127.0.0.1:8080/api/mobile-config', {
          timeout: 2000,
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.CLOUDFLARE_URL || null;
        }
      } catch {}
    }
    return null;
  }

  private async getLocalNetworkIps(): Promise<string[]> {
    // В реальном приложении здесь можно использовать react-native-network-info
    // Но пока возвращаем пустой массив - URL будут добавляться вручную
    return [];
  }

  async setBaseUrl(url: string) {
    this.baseUrl = url;
    await AsyncStorage.setItem(STORAGE_KEYS.API_URL, url);
    console.log('📡 API URL установлен:', url);
  }

  getCurrentUrl(): string {
    return this.baseUrl;
  }

  // ========== HTTP Methods ==========

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    skipAuth: boolean = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Добавляем токен авторизации
    if (!skipAuth) {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const config: RequestInit = {
      ...options,
      headers,
      timeout: 15000, // 15 секунд
    };

    try {
      console.log(`🌐 ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, config);
      
      // Пробуем получить JSON ответ
      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      if (!response.ok) {
        // Обрабатываем ошибки авторизации
        if (response.status === 401) {
          await this.clearAuth();
          throw new Error(data.detail?.message || data.message || 'Требуется авторизация');
        }
        
        throw new Error(data.detail?.message || data.message || `Ошибка ${response.status}`);
      }

      return data;
    } catch (error: any) {
      console.error(`❌ Ошибка запроса ${endpoint}:`, error.message);
      
      // Специальная обработка для ошибок сети
      if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
        throw new Error('Не удалось подключиться к серверу. Проверьте настройки подключения.');
      }
      
      throw error;
    }
  }

  async get<T = any>(endpoint: string, skipAuth: boolean = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, skipAuth);
  }

  async post<T = any>(endpoint: string, data?: any, skipAuth: boolean = false): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      skipAuth
    );
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ========== Auth Methods ==========

  async setAuth(token: string, user: User) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
      console.log('🔐 Токен сохранен');
    } catch (error) {
      console.error('❌ Ошибка сохранения токена:', error);
      throw error;
    }
  }

  async getAuthToken(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  async getUser(): Promise<User | null> {
    try {
      const userStr = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_USER);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  async clearAuth() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.AUTH_USER,
        STORAGE_KEYS.PROFILE,
      ]);
      console.log('🧹 Данные авторизации очищены');
    } catch (error) {
      console.error('❌ Ошибка очистки данных:', error);
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    const user = await this.getUser();
    return !!(token && user);
  }

  // ========== Profile Methods ==========

  async saveProfile(profile: Profile) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (error) {
      console.error('❌ Ошибка сохранения профиля:', error);
    }
  }

  async getSavedProfile(): Promise<Profile | null> {
    try {
      const profileStr = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      return profileStr ? JSON.parse(profileStr) : null;
    } catch {
      return null;
    }
  }
}

// Создаем и экспортируем единственный экземпляр
export const api = new ApiService();