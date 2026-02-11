import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ApiConfig {
  apiUrl: string;
  isNgrok: boolean;
  lastUpdated: number;
}

export class ConfigService {
  private static readonly CONFIG_KEY = 'api_config';
  private static readonly DEFAULT_URLS = {
    localhost: 'http://localhost:8000',
    androidEmulator: 'http://10.0.2.2:8000',
    // Добавьте ваш WiFi IP как fallback
    wifi: 'http://192.168.50.171:8000',
  };

  static async getApiUrl(): Promise<string> {
    try {
      // 1. Пробуем получить сохраненный ngrok URL
      const savedConfig = await AsyncStorage.getItem(this.CONFIG_KEY);
      if (savedConfig) {
        const config: ApiConfig = JSON.parse(savedConfig);
        
        // Проверяем не устарел ли URL (больше 24 часов)
        const hoursSinceUpdate = (Date.now() - config.lastUpdated) / (1000 * 60 * 60);
        if (hoursSinceUpdate < 24 && await this.testUrl(config.apiUrl)) {
          return config.apiUrl;
        }
      }

      // 2. Пробуем получить текущий URL с бэкенда
      const ngrokUrl = await this.fetchCurrentNgrokUrl();
      if (ngrokUrl && await this.testUrl(ngrokUrl)) {
        await this.saveConfig(ngrokUrl, true);
        return ngrokUrl;
      }

      // 3. Пробуем стандартные URL
      for (const [name, url] of Object.entries(this.DEFAULT_URLS)) {
        console.log(`Пробуем подключиться к ${name}: ${url}`);
        if (await this.testUrl(url)) {
          return url;
        }
      }

      // 4. Fallback
      return this.DEFAULT_URLS.wifi;
    } catch (error) {
      console.error('Ошибка получения URL:', error);
      return this.DEFAULT_URLS.wifi;
    }
  }

  static async fetchCurrentNgrokUrl(): Promise<string | null> {
    try {
      // Пробуем разные endpoints для получения ngrok URL
      const endpoints = [
        '/api/ngrok-info',
        '/ngrok_url.json',
        '/mobile_config.json'
      ];

      for (const baseUrl of Object.values(this.DEFAULT_URLS)) {
        for (const endpoint of endpoints) {
          try {
            const response = await fetch(`${baseUrl}${endpoint}`, {
              timeout: 3000
            });
            
            if (response.ok) {
              const data = await response.json();
              
              if (endpoint === '/api/ngrok-info') {
                return data.public_url;
              } else if (endpoint === '/ngrok_url.json') {
                return data.api_url;
              } else if (endpoint === '/mobile_config.json') {
                return data.API_BASE_URL;
              }
            }
          } catch {
            continue;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка получения ngrok URL:', error);
      return null;
    }
  }

  static async testUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  static async saveConfig(apiUrl: string, isNgrok: boolean): Promise<void> {
    const config: ApiConfig = {
      apiUrl,
      isNgrok,
      lastUpdated: Date.now()
    };
    
    await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
  }

  static async clearConfig(): Promise<void> {
    await AsyncStorage.removeItem(this.CONFIG_KEY);
  }
}