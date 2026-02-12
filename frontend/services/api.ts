import AsyncStorage from '@react-native-async-storage/async-storage';

// ========== TYPES ==========
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

// ========== STORAGE KEYS ==========
const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  AUTH_USER: 'auth_user',
  API_URL: 'api_url',
  PROFILE: 'user_profile',
} as const;

// ========== API SERVICE ==========
class ApiService {
  private baseUrl: string = 'http://192.168.0.30:8081';
  private readonly DEFAULT_PORT = 8081;

  constructor() {
    this.loadSavedUrl();
  }

  // ========== URL MANAGEMENT ==========
  private async loadSavedUrl() {
    try {
      const savedUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_URL);
      if (savedUrl) {
        this.baseUrl = savedUrl;
        console.log('📡 Загружен сохраненный URL:', this.baseUrl);
      } else {
        await this.setBaseUrl('http://192.168.0.30:8080');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки URL:', error);
    }
  }

  async discoverApiUrl(): Promise<string> {
    const urlsToTry = [
      'http://192.168.0.30:8080',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'http://10.0.2.2:8080',
    ];

    console.log('🔍 Проверяем доступные API URL:', urlsToTry);

    for (const url of urlsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

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

    console.log('⚠️ Не удалось найти API, используем 192.168.0.30:8081');
    return 'http://192.168.0.30:8081';
  }

  async setBaseUrl(url: string) {
    this.baseUrl = url;
    await AsyncStorage.setItem(STORAGE_KEYS.API_URL, url);
    console.log('📡 API URL установлен:', url);
  }

  getCurrentUrl(): string {
    return this.baseUrl;
  }

  // ========== HTTP METHODS ==========
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

    if (!skipAuth) {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      console.log(`🌐 ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, config);
      
      let data: any;
      const contentType = response.headers.get('content-type');
      
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
        if (response.status === 401) {
          await this.clearAuth();
          throw new Error(data.detail?.message || data.message || 'Требуется авторизация');
        }
        throw new Error(data.detail?.message || data.message || `Ошибка ${response.status}`);
      }

      return data;
    } catch (error: any) {
      console.error(`❌ Ошибка запроса ${endpoint}:`, error.message);
      if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
        throw new Error('Не удалось подключиться к серверу. Проверьте, запущен ли бэкенд на порту 8081');
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

  // ========== AUTH METHODS ==========
  async setAuth(token: string, user: User) {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    console.log('🔐 Токен сохранен');
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
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.AUTH_USER,
      STORAGE_KEYS.PROFILE,
    ]);
    console.log('🧹 Данные авторизации очищены');
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    const user = await this.getUser();
    return !!(token && user);
  }

  // ========== PROFILE METHODS ==========
  async saveProfile(profile: Profile) {
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
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

export const api = new ApiService();