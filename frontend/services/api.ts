import { ConfigService } from './config';

class ApiService {
  private baseUrl: string | null = null;
  
  async initialize(): Promise<void> {
    if (!this.baseUrl) {
      this.baseUrl = await ConfigService.getApiUrl();
      console.log(`🌐 API инициализирован: ${this.baseUrl}`);
    }
  }
  
  async get<T>(endpoint: string): Promise<T> {
    await this.initialize();
    console.log(`📡 GET: ${this.baseUrl}${endpoint}`);
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`❌ GET ${endpoint}:`, error);
      throw error;
    }
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    await this.initialize();
    console.log(`📡 POST: ${this.baseUrl}${endpoint}`, data);
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result as T;
    } catch (error) {
      console.error(`❌ POST ${endpoint}:`, error);
      throw error;
    }
  }
  
  async put<T>(endpoint: string, data: any): Promise<T> {
    await this.initialize();
    console.log(`📡 PUT: ${this.baseUrl}${endpoint}`, data);
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result as T;
    } catch (error) {
      console.error(`❌ PUT ${endpoint}:`, error);
      throw error;
    }
  }
  
  async patch<T>(endpoint: string, data: any): Promise<T> {
    await this.initialize();
    console.log(`📡 PATCH: ${this.baseUrl}${endpoint}`, data);
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result as T;
    } catch (error) {
      console.error(`❌ PATCH ${endpoint}:`, error);
      throw error;
    }
  }
  
  async delete<T>(endpoint: string): Promise<T> {
    await this.initialize();
    console.log(`📡 DELETE: ${this.baseUrl}${endpoint}`);
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result as T;
    } catch (error) {
      console.error(`❌ DELETE ${endpoint}:`, error);
      throw error;
    }
  }
  
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await this.initialize();
    console.log(`📡 REQUEST ${options.method || 'GET'}: ${this.baseUrl}${endpoint}`);
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`❌ REQUEST ${endpoint}:`, error);
      throw error;
    }
  }
  
  async updateBaseUrl(newUrl: string): Promise<boolean> {
    try {
      // Обрабатываем URL
      let urlToTest = newUrl.trim();
      
      // Добавляем http:// если нет и не Cloudflare
      if (!urlToTest.startsWith('http')) {
        urlToTest = `http://${urlToTest}`;
      }

      // Проверяем порт для локальных адресов
      if (!urlToTest.includes('https://') && !urlToTest.includes(':')) {
        urlToTest = `${urlToTest}:8080`;
      }

      const isValid = await ConfigService.testUrl(urlToTest);
      if (isValid) {
        this.baseUrl = urlToTest;
        const isCloudflare = urlToTest.includes('trycloudflare.com') || urlToTest.includes('cfargotunnel.com');
        const isNgrok = urlToTest.includes('ngrok.io');
        await ConfigService.saveConfig(urlToTest, isCloudflare, isNgrok);
        console.log(`✅ URL обновлен: ${urlToTest} (Cloudflare: ${isCloudflare}, Ngrok: ${isNgrok})`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Ошибка обновления URL:', error);
      return false;
    }
  }
  
  getCurrentUrl(): string | null {
    return this.baseUrl;
  }
}

export const api = new ApiService();