import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';

export default function IosTestScreen() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Тестовые URL для разных сценариев
  const testUrls = [
    {
      name: 'iOS Simulator (localhost)',
      url: 'http://localhost:8000/api/ios-test',
      description: 'Для iOS симулятора на Mac',
    },
    {
      name: 'iOS Device WiFi',
      url: 'http://192.168.50.171:8000/api/ios-test', // ЗАМЕНИТЕ НА СВОЙ IP!
      description: 'Для физического iPhone в той же WiFi',
    },
    {
      name: 'Direct IP Test',
      url: 'http://127.0.0.1:8000/api/ios-test',
      description: 'Прямое подключение',
    },
  ];

  const testConnection = async (testUrl: string, testName: string) => {
    setLoading(true);
    setResult(`Тестируем: ${testName}...\nURL: ${testUrl}\n\n`);
    
    try {
      console.log(`📱 [iOS] Пробуем: ${testUrl}`);
      
      // Добавляем timeout для iOS
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      console.log(`📥 [iOS] Ответ (${response.status}):`, responseText.substring(0, 200));
      
      if (response.ok) {
        try {
          const jsonData = JSON.parse(responseText);
          setResult(prev => prev + 
            `✅ УСПЕХ!\n` +
            `Статус: ${response.status}\n` +
            `Ответ: ${JSON.stringify(jsonData, null, 2)}\n\n` +
            `Платформа: ${Platform.OS}\n` +
            `Версия: ${Platform.Version}`
          );
          
          Alert.alert('✅ Успех!', `iOS подключение к ${testName} работает!`);
        } catch (e) {
          setResult(prev => prev + 
            `⚠️ Получен не JSON:\n${responseText.substring(0, 200)}...\n\n` +
            `Возможно, сервер возвращает HTML`
          );
          Alert.alert('⚠️ Внимание', 'Сервер вернул не JSON');
        }
      } else {
        setResult(prev => prev + 
          `❌ HTTP Ошибка: ${response.status}\n` +
          `Текст: ${responseText}\n`
        );
        Alert.alert('❌ Ошибка', `HTTP ${response.status}`);
      }
    } catch (error: any) {
      console.error('❌ [iOS] Ошибка сети:', error);
      
      let errorMessage = error.message;
      if (error.name === 'AbortError') {
        errorMessage = 'Таймаут (10 секунд) - сервер не отвечает';
      }
      
      setResult(prev => prev + 
        `❌ ОШИБКА ПОДКЛЮЧЕНИЯ:\n` +
        `${errorMessage}\n\n` +
        `Возможные причины:\n` +
        `1. Бэкенд не запущен\n` +
        `2. Неправильный IP адрес\n` +
        `3. Firewall блокирует порт 8000\n` +
        `4. CORS не настроен на бэкенде`
      );
      
      Alert.alert('❌ Ошибка сети', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📱 iOS Тест подключения</Text>
      
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Текущая платформа:</Text>
        <Text style={styles.infoText}>OS: {Platform.OS}</Text>
        <Text style={styles.infoText}>Version: {Platform.Version}</Text>
      </View>
      
      <Text style={styles.sectionTitle}>Тестовые подключения:</Text>
      
      {testUrls.map((test, index) => (
        <View key={index} style={styles.testCard}>
          <Text style={styles.testName}>{test.name}</Text>
          <Text style={styles.testUrl}>{test.url}</Text>
          <Text style={styles.testDesc}>{test.description}</Text>
          <Button
            title={loading ? 'Тестируем...' : 'Протестировать'}
            onPress={() => testConnection(test.url, test.name)}
            disabled={loading}
          />
        </View>
      ))}
      <View style={styles.testCard}>
        <Button
          title='adminpanel'
          onPress={() => router.push('/check_connect')}
        />
      </View>
      
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📋 Инструкция для iOS:</Text>
        <Text>1. Узнайте IP компьютера:</Text>
        <Text style={styles.code}>   Windows: ipconfig</Text>
        <Text style={styles.code}>   Mac: ifconfig | grep "inet "</Text>
        <Text>2. Замените 192.168.1.100 на ваш IP</Text>
        <Text>3. Запустите бэкенд: python test_api.py</Text>
        <Text>4. Нажмите "iOS Device WiFi"</Text>
      </View>
      
      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>Результаты:</Text>
        <ScrollView style={styles.resultBox}>
          <Text style={styles.resultText}>{result || 'Нажмите кнопку для теста...'}</Text>
        </ScrollView>
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
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  testCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  testName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  testUrl: {
    fontSize: 12,
    color: 'gray',
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  testDesc: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  instructions: {
    backgroundColor: '#fff8e1',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 5,
    marginVertical: 2,
  },
  resultContainer: {
    marginTop: 20,
  },
  resultTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultBox: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    minHeight: 150,
    maxHeight: 300,
  },
  resultText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
});