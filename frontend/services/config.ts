import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ApiConfig {
  apiUrl: string;
  isCloudflare: boolean;
  isNgrok: boolean;
  lastUpdated: number;
  cloudflareUrl?: string;
}

export class ConfigService {
  private static readonly CONFIG_KEY = 'api_config';
  private static readonly DEFAULT_URLS = {
    localhost: 'http://localhost:8080',
    androidEmulator: 'http://10.0.2.2:8080',
    wifi: 'http://192.168.50.171:8080',
  };
  
  // Добавляем Cloudflare тестовый URL
  private static readonly CLOUDFLARE_TEST_URL = 'https://florists-code-jungle-contributors.trycloudflare.com';

  static async getApiUrl(): Promise<string> {
    try {
      // 1. Пробуем получить сохраненный конфиг
      const savedConfig = await AsyncStorage.getItem(this.CONFIG_KEY);
      if (savedConfig) {
        const config: ApiConfig = JSON.parse(savedConfig);
        
        // Проверяем не устарел ли URL (больше 24 часов)
        const hoursSinceUpdate = (Date.now() - config.lastUpdated) / (1000 * 60 * 60);
        if (hoursSinceUpdate < 24 && await this.testUrl(config.apiUrl)) {
          console.log(`✅ Использую сохраненный URL: ${config.apiUrl}`);
          return config.apiUrl;
        }
      }

      // 2. Пробуем Cloudflare URL
      console.log(`🔍 Проверяю Cloudflare URL: ${this.CLOUDFLARE_TEST_URL}`);
      if (await this.testUrl(this.CLOUDFLARE_TEST_URL)) {
        console.log(`✅ Cloudflare работает!`);
        const config: ApiConfig = {
          apiUrl: this.CLOUDFLARE_TEST_URL,
          isCloudflare: true,
          isNgrok: false,
          lastUpdated: Date.now(),
          cloudflareUrl: this.CLOUDFLARE_TEST_URL
        };
        await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
        return this.CLOUDFLARE_TEST_URL;
      }

      // 3. Пробуем получить текущий URL с бэкенда (Cloudflare info)
      const cloudflareUrl = await this.fetchCloudflareInfo();
      if (cloudflareUrl && await this.testUrl(cloudflareUrl)) {
        await this.saveConfig(cloudflareUrl, true, false);
        return cloudflareUrl;
      }

      // 4. Пробуем стандартные URL
      for (const [name, url] of Object.entries(this.DEFAULT_URLS)) {
        console.log(`🔍 Пробую подключиться к ${name}: ${url}`);
        if (await this.testUrl(url)) {
          console.log(`✅ Подключено к ${name}`);
          await this.saveConfig(url, false, false);
          return url;
        }
      }

      // 5. Fallback
      console.log('⚠️ Все попытки подключения провалились, использую Cloudflare как fallback');
      return this.CLOUDFLARE_TEST_URL;
    } catch (error) {
      console.error('❌ Ошибка получения URL:', error);
      return this.CLOUDFLARE_TEST_URL;
    }
  }

  static async fetchCloudflareInfo(): Promise<string | null> {
    try {
      console.log('🔍 Получаю информацию о Cloudflare...');
      
      const endpoints = [
        '/api/cloudflare-info',
        '/api/connection-info',
        '/api/test-cloudflare'
      ];

      // Пробуем разные локальные адреса
      const baseUrls = [
        'http://localhost:8080',
        'http://192.168.50.171:8080',
        'http://10.0.2.2:8080'
      ];

      for (const baseUrl of baseUrls) {
        for (const endpoint of endpoints) {
          try {
            console.log(`🔍 Проверяю: ${baseUrl}${endpoint}`);
            const response = await fetch(`${baseUrl}${endpoint}`, {
              method: 'GET',
              timeout: 3000
            });
            
            if (response.ok) {
              const data = await response.json();
              
              if (data.public_url || data.url) {
                const cloudflareUrl = data.public_url || data.url;
                console.log(`✅ Найден Cloudflare URL: ${cloudflareUrl}`);
                return cloudflareUrl;
              }
              
              if (data.cloudflare_tunnel?.public_url) {
                console.log(`✅ Найден Cloudflare URL: ${data.cloudflare_tunnel.public_url}`);
                return data.cloudflare_tunnel.public_url;
              }
            }
          } catch (error) {
            console.log(`❌ Ошибка при проверке ${baseUrl}${endpoint}:`, error.message);
            continue;
          }
        }
      }
      
      console.log('❌ Cloudflare URL не найден автоматически');
      return null;
    } catch (error) {
      console.error('❌ Ошибка получения Cloudflare информации:', error);
      return null;
    }
  }

  static async testUrl(url: string): Promise<boolean> {
    try {
      console.log(`🔍 Тестирую URL: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const success = response.ok;
      console.log(success ? `✅ URL работает: ${url}` : `❌ URL не отвечает: ${url}`);
      return success;
    } catch (error) {
      console.log(`❌ Ошибка тестирования ${url}:`, error.message);
      return false;
    }
  }

  static async saveConfig(apiUrl: string, isCloudflare: boolean, isNgrok: boolean): Promise<void> {
    const config: ApiConfig = {
      apiUrl,
      isCloudflare,
      isNgrok,
      lastUpdated: Date.now(),
      cloudflareUrl: isCloudflare ? apiUrl : undefined
    };
    
    console.log(`💾 Сохраняю конфиг:`, config);
    await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
  }

  static async clearConfig(): Promise<void> {
    console.log('🗑️ Очищаю конфиг');
    await AsyncStorage.removeItem(this.CONFIG_KEY);
  }

  static async getCurrentConfig(): Promise<ApiConfig | null> {
    try {
      const savedConfig = await AsyncStorage.getItem(this.CONFIG_KEY);
      return savedConfig ? JSON.parse(savedConfig) : null;
    } catch {
      return null;
    }
  }
  
  static async isCloudflareActive(): Promise<boolean> {
    const config = await this.getCurrentConfig();
    return config?.isCloudflare || false;
  }
}