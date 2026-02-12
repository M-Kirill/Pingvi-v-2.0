import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ApiConfig {
  apiUrl: string;
  lastUpdated: number;
}

export class ConfigService {
  private static readonly CONFIG_KEY = 'api_config';
  
  private static readonly DEFAULT_URLS = [
    'http://192.168.0.30:8080',
    'http://localhost:8080',
    'http://10.0.2.2:8080',
  ];

  static async getApiUrl(): Promise<string> {
    try {
      const savedConfig = await AsyncStorage.getItem(this.CONFIG_KEY);
      if (savedConfig) {
        const config: ApiConfig = JSON.parse(savedConfig);
        if (await this.testUrl(config.apiUrl)) {
          console.log(`✅ Использую сохраненный URL: ${config.apiUrl}`);
          return config.apiUrl;
        }
      }

      for (const url of this.DEFAULT_URLS) {
        console.log(`🔍 Пробую: ${url}`);
        if (await this.testUrl(url)) {
          console.log(`✅ Подключено к: ${url}`);
          await this.saveConfig(url);
          return url;
        }
      }

      console.log('⚠️ Использую fallback URL: 192.168.0.30:8081');
      return 'http://192.168.0.30:8081';
    } catch (error) {
      console.error('❌ Ошибка получения URL:', error);
      return 'http://192.168.0.30:8081';
    }
  }

  static async testUrl(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  static async saveConfig(apiUrl: string): Promise<void> {
    const config: ApiConfig = {
      apiUrl,
      lastUpdated: Date.now(),
    };
    await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
  }

  static async clearConfig(): Promise<void> {
    await AsyncStorage.removeItem(this.CONFIG_KEY);
  }
}