import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { authService } from '../services/auth';

export default function TestConnectionScreen() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [testData, setTestData] = useState<any>(null);

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testApiConnection = async () => {
    setLoading(true);
    addResult('=== Начало теста API ===');
    
    try {
      // 1. Тест основного эндпоинта
      addResult('Тест 1: Проверка доступности API...');
      const response = await fetch('http://192.168.0.30:8000');
      const data = await response.json();
      addResult(`✅ API доступен: ${data.api} ${data.version}`);
      setTestData(data);
      
      // 2. Тест документации
      addResult('Тест 2: Проверка Swagger docs...');
      const docsResponse = await fetch('http://192.168.0.30:8000/docs');
      if (docsResponse.ok) {
        addResult('✅ Документация доступна');
      } else {
        addResult('⚠️ Документация не доступна');
      }
      
      // 3. Тест эндпоинта авторизации (без данных)
      addResult('Тест 3: Проверка эндпоинта /api/auth/login...');
      const authResponse = await fetch('http://192.168.0.30:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: 'test', password: 'test' })
      });
      addResult(`✅ Эндпоинт auth/login доступен (статус: ${authResponse.status})`);
      
      // 4. Тест методом из authService
      addResult('Тест 4: Проверка через authService...');
      const serviceTest = await authService.testConnection();
      addResult(serviceTest ? '✅ authService работает' : '❌ authService не работает');
      
    } catch (error: any) {
      addResult(`❌ Ошибка: ${error.message}`);
    }
    
    addResult('=== Тест завершен ===');
    setLoading(false);
  };

  const testLogin = async () => {
    // Замените на реальные данные из вашего бота
    const testLogin = 'user_12345'; // из issued_data.json
    const testPassword = 'abc123';  // из issued_data.json
    
    if (!testLogin || !testPassword) {
      Alert.alert('Ошибка', 'Добавьте тестовые данные в код');
      return;
    }
    
    setLoading(true);
    addResult(`Тест входа с логином: ${testLogin}`);
    
    const result = await authService.login(
      testLogin,
      testPassword,
      `iOS ${Platform.Version}`
    );
    
    if (result.success) {
      addResult(`✅ Вход успешен! Токен: ${result.token?.substring(0, 20)}...`);
      addResult(`👤 Пользователь: ${result.user?.first_name} (${result.user?.login})`);
    } else {
      addResult(`❌ Ошибка входа: ${result.message}`);
    }
    
    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
    setTestData(null);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔧 Тест подключения к API</Text>
      
      <Text style={styles.subtitle}>
        Адрес API: http://192.168.0.30:8000
      </Text>
      
      <Text style={styles.platform}>
        Платформа: {Platform.OS} {Platform.Version}
      </Text>
      
      <View style={styles.buttonContainer}>
        <Button
          title="Тест подключения к API"
          onPress={testApiConnection}
          disabled={loading}
        />
        
        <View style={styles.buttonSpacer} />
        
        <Button
          title="Тест авторизации"
          onPress={testLogin}
          disabled={loading}
          color="#4CAF50"
        />
        
        <View style={styles.buttonSpacer} />
        
        <Button
          title="Очистить логи"
          onPress={clearResults}
          color="#FF9800"
        />
      </View>
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text>Тестирование...</Text>
        </View>
      )}
      
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Результаты:</Text>
        {results.map((result, index) => (
          <Text 
            key={index} 
            style={[
              styles.resultText,
              result.includes('✅') && styles.successText,
              result.includes('❌') && styles.errorText,
              result.includes('⚠️') && styles.warningText,
            ]}
          >
            {result}
          </Text>
        ))}
      </View>
      
      {testData && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataTitle}>Данные API:</Text>
          <Text style={styles.dataText}>
            {JSON.stringify(testData, null, 2)}
          </Text>
        </View>
      )}
      
      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>Инструкция:</Text>
        <Text>1. Убедитесь что бэкенд запущен</Text>
        <Text>2. Нажмите "Тест подключения к API"</Text>
        <Text>3. Если API доступен - тестируйте вход</Text>
        <Text>4. Для теста входа нужны реальные логин/пароль из бота</Text>
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
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  platform: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  buttonSpacer: {
    height: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  resultsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultsTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    fontSize: 16,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginVertical: 2,
    color: '#333',
  },
  successText: {
    color: '#4CAF50',
  },
  errorText: {
    color: '#F44336',
  },
  warningText: {
    color: '#FF9800',
  },
  dataContainer: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  dataTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dataText: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  instructions: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
});