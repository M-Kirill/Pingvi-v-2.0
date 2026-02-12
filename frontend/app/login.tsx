import { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Text,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { authService } from '../services/auth';
import { profileService } from '../services/profile';
import { api } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [discoveringUrl, setDiscoveringUrl] = useState(false);
  const router = useRouter();

  // При загрузке экрана пытаемся обнаружить API
  useEffect(() => {
    autoDiscoverApi();
  }, []);

  const autoDiscoverApi = async () => {
    try {
      setDiscoveringUrl(true);
      const url = await authService.discoverApiUrl();
      console.log('📡 API URL обнаружен:', url);
    } catch (error) {
      console.log('⚠️ Не удалось обнаружить API');
    } finally {
      setDiscoveringUrl(false);
    }
  };

  const handleContinue = async () => {
    if (!login.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Введите логин и пароль');
      return;
    }

    setLoading(true);

    try {
      console.log("🔐 Попытка авторизации...");
      
      const authResult = await authService.login(
        login.trim(),
        password.trim(),
        'Mobile App'
      );

      if (authResult.success && authResult.token && authResult.user) {
        console.log("✅ Авторизация успешна");
        
        // Загружаем полный профиль
        const profile = await profileService.getProfile(true);
        
        if (profile) {
          console.log("✅ Профиль загружен");
          
          // Определяем маршрут перенаправления
          let redirectPath = '/tasks';
          
          if (authResult.user.role === 'child') {
            redirectPath = '/tasks_for_child';
          } else if (profile.children_count === 0) {
            redirectPath = '/welcome_screen';
          }
          
          console.log(`📍 Перенаправление на: ${redirectPath}`);
          router.replace(redirectPath);
        } else {
          // Если профиль не загрузился, используем базовые данные
          const redirectPath = authResult.user.role === 'child' 
            ? '/tasks_for_child' 
            : '/welcome_screen';
          
          router.replace(redirectPath);
        }
      } else {
        console.log("❌ Ошибка авторизации:", authResult.message);
        
        Alert.alert(
          'Ошибка', 
          authResult.message || 'Неверный логин или пароль'
        );
        setPassword('');
      }

    } catch (error: any) {
      console.error('❌ Ошибка авторизации:', error);
      
      let errorMessage = 'Произошла ошибка при авторизации';
      let showConnectionHelp = false;
      
      if (error.message?.includes('подключиться') || 
          error.message?.includes('Network')) {
        errorMessage = 'Не удалось подключиться к серверу. Проверьте настройки.';
        showConnectionHelp = true;
      }
      
      if (showConnectionHelp) {
        Alert.alert(
          'Ошибка подключения',
          errorMessage,
          [
            {
              text: 'Настройки',
              onPress: () => router.push('/check_connect')
            },
            {
              text: 'Повторить',
              onPress: () => setLoading(false)
            }
          ]
        );
      } else {
        Alert.alert('Ошибка', errorMessage);
        setLoading(false);
      }
    }
  };

  const handleTestConnection = async () => {
    try {
      setLoading(true);
      const currentUrl = authService.getCurrentApiUrl();
      
      Alert.alert(
        'Проверка подключения',
        `Текущий URL: ${currentUrl}\n\nПроверяю соединение...`
      );
      
      const connected = await authService.testConnection();
      
      if (connected) {
        Alert.alert(
          '✅ Соединение установлено',
          `API сервер доступен:\n${currentUrl}`
        );
      } else {
        Alert.alert(
          '❌ Нет соединения',
          `Сервер не отвечает по адресу:\n${currentUrl}`
        );
      }
    } catch (error) {
      Alert.alert('❌ Ошибка', 'Не удалось проверить соединение');
    } finally {
      setLoading(false);
    }
  };

  if (discoveringUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8D41C1" />
          <Text style={styles.loadingText}>Поиск сервера...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        disabled={loading}
      >
        <Image
          source={require('../assets/back.png')}
          style={[styles.backIcon, loading && { opacity: 0.5 }]}
        />
      </TouchableOpacity>

      {/* Кнопка проверки соединения */}
      <TouchableOpacity
        style={styles.testButton}
        onLongPress={handleTestConnection}
        delayLongPress={2000}
      >
        <Text style={styles.testButtonText}>🔗</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.logo}>Пингви</Text>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Добро пожаловать!</Text>
          <Text style={styles.description}>
            Пожалуйста, введите логин и пароль,{'\n'}полученный в Telegram.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, loading && { opacity: 0.7 }]}
              placeholder="Логин"
              placeholderTextColor="#BDBDBD"
              value={login}
              onChangeText={setLogin}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, loading && { opacity: 0.7 }]}
              placeholder="Пароль"
              placeholderTextColor="#BDBDBD"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.continueButton,
              (login && password && !loading)
                ? styles.continueButtonActive
                : styles.continueButtonInactive
            ]}
            onPress={handleContinue}
            disabled={!login || !password || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={[
                styles.continueButtonText,
                (login && password)
                  ? styles.continueButtonTextActive
                  : styles.continueButtonTextInactive
              ]}>
                Продолжить
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#8D41C1',
  },
  backButton: {
    position: 'absolute',
    left: 15,
    top: 89,
    width: 28,
    height: 28,
    zIndex: 10,
  },
  backIcon: {
    width: 28,
    height: 28,
  },
  testButton: {
    position: 'absolute',
    top: 89,
    right: 15,
    width: 28,
    height: 28,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(141, 65, 193, 0.1)',
    borderRadius: 14,
  },
  testButtonText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 61,
    paddingBottom: 370,
  },
  logo: {
    fontSize: 40,
    fontWeight: '900',
    color: '#8D41C1',
    letterSpacing: -0.8,
    textAlign: 'center',
    alignSelf: 'stretch',
    marginBottom: 10,
  },
  titleContainer: {
    alignSelf: 'stretch',
    marginBottom: 44,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#373635',
    textAlign: 'left',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: '#373635',
    lineHeight: 20,
    letterSpacing: 0.25,
    textAlign: 'left',
  },
  form: {
    width: '100%',
    alignItems: 'center',
  },
  inputContainer: {
    width: SCREEN_WIDTH - 22.5*2,
    height: 45,
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 25,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  input: {
    fontSize: 14,
    color: '#373635',
    padding: 0,
    width: '100%',
  },
  continueButton: {
    width: SCREEN_WIDTH - 22.5*2,
    height: 45,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  continueButtonActive: {
    backgroundColor: '#8D41C1',
  },
  continueButtonInactive: {
    backgroundColor: '#E0E0E0',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  continueButtonTextActive: {
    color: '#FFFFFF',
  },
  continueButtonTextInactive: {
    color: '#BDBDBD',
  },
});