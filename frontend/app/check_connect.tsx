import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { api } from '../services/api';
import { ConfigService } from '../services/config';
import { authService } from '../services/auth';

export default function ConnectionScreen() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [isCloudflare, setIsCloudflare] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<any>(null);

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    setLoading(true);
    try {
      const url = await ConfigService.getApiUrl();
      setCurrentUrl(url);
      
      const config = await ConfigService.getCurrentConfig();
      setIsCloudflare(config?.isCloudflare || false);
      
      // Проверяем подключение
      const isConnected = await testConnection(url);
      setConnectionStatus(isConnected ? '✅ Подключено' : '❌ Нет подключения');
      
      if (isConnected) {
        await getConnectionDetails(url);
      }
    } catch (error) {
      console.error('Ошибка загрузки конфига:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const getConnectionDetails = async (url: string) => {
    try {
      const response = await fetch(`${url}/api/connection-info`);
      if (response.ok) {
        const data = await response.json();
        setConnectionDetails(data);
      }
    } catch (error) {
      console.error('Ошибка получения деталей:', error);
    }
  };

  const handleTestUrl = async () => {
    if (!testUrl) {
      Alert.alert('Ошибка', 'Введите URL для теста');
      return;
    }

    setLoading(true);
    try {
      // Обрабатываем URL
      let urlToTest = testUrl.trim();
      
      // Добавляем http:// если нет и не Cloudflare
      if (!urlToTest.startsWith('http')) {
        urlToTest = `http://${urlToTest}`;
      }

      // Проверяем порт для локальных адресов
      if (!urlToTest.includes('https://') && !urlToTest.includes(':')) {
        urlToTest = `${urlToTest}:8080`;
      }

      const isConnected = await testConnection(urlToTest);
      
      if (isConnected) {
        Alert.alert('✅ Успех!', 'Подключение установлено');
        setCurrentUrl(urlToTest);
        setConnectionStatus('✅ Подключено');
        
        // Определяем тип подключения
        const isCloudflareTest = urlToTest.includes('trycloudflare.com') || urlToTest.includes('cfargotunnel.com');
        const isNgrokTest = urlToTest.includes('ngrok.io');
        setIsCloudflare(isCloudflareTest);
        
        // Сохраняем новый URL
        await ConfigService.saveConfig(urlToTest, isCloudflareTest, isNgrokTest);
        
        // Обновляем API
        await api.updateBaseUrl(urlToTest);
        
        // Получаем детали
        await getConnectionDetails(urlToTest);
      } else {
        Alert.alert('❌ Ошибка', 'Не удалось подключиться');
        setConnectionStatus('❌ Нет подключения');
      }
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDetect = async () => {
    setLoading(true);
    setConnectionStatus('🔍 Поиск Cloudflare...');
    
    try {
      // 1. Пробуем Cloudflare
      const cloudflareUrl = 'https://florists-code-jungle-contributors.trycloudflare.com';
      if (await testConnection(cloudflareUrl)) {
        setCurrentUrl(cloudflareUrl);
        setTestUrl(cloudflareUrl);
        setConnectionStatus('✅ Cloudflare найден');
        setIsCloudflare(true);
        
        await ConfigService.saveConfig(cloudflareUrl, true, false);
        await api.updateBaseUrl(cloudflareUrl);
        
        Alert.alert('✅ Успех!', `Cloudflare Tunnel работает!\n${cloudflareUrl}`);
        return;
      }
      
      // 2. Пробуем получить Cloudflare URL с сервера
      const detectedCloudflareUrl = await ConfigService.fetchCloudflareInfo();
      if (detectedCloudflareUrl && await testConnection(detectedCloudflareUrl)) {
        setCurrentUrl(detectedCloudflareUrl);
        setTestUrl(detectedCloudflareUrl);
        setConnectionStatus('✅ Cloudflare найден автоматически');
        setIsCloudflare(true);
        
        await ConfigService.saveConfig(detectedCloudflareUrl, true, false);
        await api.updateBaseUrl(detectedCloudflareUrl);
        
        Alert.alert('✅ Успех!', `Cloudflare найден автоматически!\n${detectedCloudflareUrl}`);
        return;
      }
      
      // 3. Пробуем стандартные URL
      const defaultUrls = [
        'http://localhost:8080',
        'http://10.0.2.2:8080',
        'http://192.168.50.171:8080',
      ];
      
      for (const url of defaultUrls) {
        if (await testConnection(url)) {
          setCurrentUrl(url);
          setTestUrl(url);
          setConnectionStatus(`✅ Подключено: ${url}`);
          setIsCloudflare(false);
          
          await ConfigService.saveConfig(url, false, false);
          await api.updateBaseUrl(url);
          
          Alert.alert('✅ Успех!', `Локальное подключение:\n${url}`);
          return;
        }
      }
      
      Alert.alert('❌ Не найдено', 'Не удалось найти доступный API');
      setConnectionStatus('❌ Не найдено');
      
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleTestAuth = async () => {
    if (!currentUrl) {
      Alert.alert('Ошибка', 'Сначала установите подключение');
      return;
    }

    setLoading(true);
    try {
      // Тестируем аутентификацию
      const isAuthenticated = await authService.isAuthenticated();
      
      if (isAuthenticated) {
        Alert.alert('✅ Аутентификация', 'Токен валиден');
      } else {
        Alert.alert('⚠️ Аутентификация', 'Требуется вход в систему');
      }
    } catch (error: any) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    await ConfigService.clearConfig();
    await api.updateBaseUrl('');
    setCurrentUrl('');
    setTestUrl('');
    setConnectionStatus('');
    setIsCloudflare(false);
    setConnectionDetails(null);
    Alert.alert('Сброс', 'Настройки сброшены');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🌐 Настройка подключения</Text>
      
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Текущее подключение:</Text>
        <Text style={styles.statusUrl}>{currentUrl || 'Не настроено'}</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>{connectionStatus}</Text>
          {isCloudflare && (
            <View style={styles.cloudflareBadge}>
              <Text style={styles.cloudflareText}>Cloudflare</Text>
            </View>
          )}
        </View>
        
        {connectionDetails && (
          <View style={styles.detailsBox}>
            <Text style={styles.detailsTitle}>Детали:</Text>
            <Text>Сервер: {connectionDetails.server?.name}</Text>
            <Text>Версия: {connectionDetails.server?.version}</Text>
            <Text>Порт: {connectionDetails.server?.port}</Text>
            {connectionDetails.cloudflare_tunnel && (
              <Text>Cloudflare: {connectionDetails.cloudflare_tunnel.status}</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Автоматическое обнаружение</Text>
        <Text style={styles.sectionDescription}>
          Попробует найти ваш бэкенд автоматически (включая Cloudflare)
        </Text>
        <Button
          title={loading ? 'Поиск...' : 'Автообнаружение'}
          onPress={handleAutoDetect}
          disabled={loading}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ручная настройка</Text>
        <TextInput
          style={styles.input}
          placeholder="https://your-tunnel.trycloudflare.com"
          value={testUrl}
          onChangeText={setTestUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          Примеры:
          {"\n"}• Cloudflare: https://abc123.trycloudflare.com
          {"\n"}• Локальный: 192.168.1.100 или localhost:8080
        </Text>
        <Button
          title="Протестировать"
          onPress={handleTestUrl}
          disabled={loading || !testUrl}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Действия</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={loadCurrentConfig}
          disabled={loading}
        >
          <Text style={styles.actionButtonText}>🔄 Обновить статус</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.testButton]}
          onPress={handleTestAuth}
          disabled={loading || !currentUrl}
        >
          <Text style={styles.actionButtonText}>🔐 Тест аутентификации</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.resetButton]}
          onPress={handleReset}
        >
          <Text style={styles.actionButtonText}>🗑️ Сбросить настройки</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text>Проверка подключения...</Text>
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Подключение Cloudflare:</Text>
        <Text>✅ Ваш Cloudflare URL:</Text>
        <Text style={styles.code}>https://florists-code-jungle-contributors.trycloudflare.com</Text>
        <Text>{"\n"}Как использовать:</Text>
        <Text>1. Вставьте URL выше и нажмите "Протестировать"</Text>
        <Text>2. Или используйте "Автообнаружение"</Text>
        <Text>3. Приложение само подберет оптимальное подключение</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusUrl: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cloudflareBadge: {
    backgroundColor: '#F38020',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  cloudflareText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  detailsTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionDescription: {
    color: '#666',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  actionButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#4CAF50',
  },
  resetButton: {
    backgroundColor: '#FF5722',
  },
  loading: {
    alignItems: 'center',
    padding: 20,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 5,
    borderRadius: 5,
    marginVertical: 5,
  },
});