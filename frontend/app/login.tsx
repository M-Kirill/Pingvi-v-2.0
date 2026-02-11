import { useState } from 'react';
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
  const router = useRouter();

  const handleContinue = async () => {
    if (!login.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Введите логин и пароль');
      return;
    }

    setLoading(true);

    try {
      console.log("🔐 Пытаюсь авторизоваться...");
      
      // Вызываем авторизацию через сервис
      const authResult = await authService.login(
        login.trim(),
        password.trim(),
        'Mobile App'
      );

      console.log("📨 Результат авторизации:", {
        success: authResult.success,
        message: authResult.message,
        hasToken: !!authResult.token,
        hasUser: !!authResult.user
      });

      if (authResult.success && authResult.token && authResult.user) {
        console.log("✅ Авторизация успешна");
        
        // Загружаем полный профиль пользователя
        console.log("📊 Загружаю профиль...");
        const profile = await profileService.getProfile();
        
        if (profile) {
          console.log("✅ Профиль загружен:", {
            userId: profile.user.id,
            name: profile.user.first_name,
            childrenCount: profile.children.length
          });
          
          // Сохраняем профиль в локальное хранилище через сервис
          await profileService.syncLocalData(profile);
          
          // Определяем куда перенаправить пользователя
          let redirectPath = '/tasks';
          
          if (authResult.user.role === 'child') {
            console.log("👶 Пользователь - ребенок, перенаправляю в детский профиль");
            redirectPath = '/child_profile';
          } else if (profile.children.length === 0) {
            console.log("👨‍👩‍👦 У родителя нет детей, показываем welcome");
            redirectPath = '/welcome_screen';
          }
          
          console.log(`📍 Перенаправляю на: ${redirectPath}`);
          router.replace(redirectPath);
          
        } else {
          console.log("⚠️ Профиль не загружен, использую базовые данные");
          
          // Если профиль не загрузился, создаем базовые данные
          await profileService.syncLocalData({
            user: authResult.user,
            children: [],
            tasks_count: 0,
            total_coins: authResult.user.coins || 0
          });
          
          // Перенаправляем в зависимости от роли
          const redirectPath = authResult.user.role === 'child' 
            ? '/child_profile' 
            : '/welcome_screen';
          
          console.log(`📍 Перенаправляю на: ${redirectPath}`);
          router.replace(redirectPath);
        }
      } else {
        console.log("❌ Ошибка авторизации:", authResult.message);
        
        Alert.alert(
          'Ошибка', 
          authResult.message || 'Неверный логин или пароль. Проверьте данные из Telegram бота.'
        );
        setPassword(''); // Очищаем пароль при ошибке
        
        // Если проблема с подключением, предлагаем проверить настройки
        if (authResult.message?.includes('сеть') || 
            authResult.message?.includes('подключиться') ||
            authResult.message?.includes('timeout')) {
          
          Alert.alert(
            'Проблема с подключением',
            'Хотите проверить настройки подключения?',
            [
              {
                text: 'Проверить',
                onPress: () => router.push('/check_connect')
              },
              {
                text: 'Повторить',
                style: 'cancel',
                onPress: () => setLoading(false)
              }
            ]
          );
        }
      }

    } catch (error: any) {
      console.error('❌ Ошибка авторизации:', error);
      
      // Анализируем тип ошибки
      let errorMessage = 'Произошла ошибка при авторизации';
      let showConnectionHelp = false;
      
      if (error.message?.includes('Network Error') || 
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('timeout')) {
        errorMessage = 'Не удалось подключиться к серверу. Проверьте:\n\n' +
                      '1. Подключение к интернету\n' +
                      '2. Что сервер запущен\n' +
                      '3. Настройки подключения в приложении';
        showConnectionHelp = true;
      } else if (error.message?.includes('JSON')) {
        errorMessage = 'Сервер вернул неверный ответ. Возможно, бэкенд не запущен.';
        showConnectionHelp = true;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (showConnectionHelp) {
        Alert.alert(
          'Ошибка подключения',
          errorMessage,
          [
            {
              text: 'Настройки подключения',
              onPress: () => router.push('/check_connect')
            },
            {
              text: 'Повторить',
              style: 'cancel',
              onPress: () => setLoading(false)
            }
          ]
        );
      } else {
        Alert.alert('Ошибка', errorMessage, [
          { text: 'OK', onPress: () => setLoading(false) }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setLoading(true);
      const currentUrl = api.getCurrentUrl();
      
      Alert.alert(
        'Проверка подключения',
        `Текущий URL: ${currentUrl || 'Не настроен'}\n\nПроверяю соединение...`
      );
      
      if (!currentUrl) {
        Alert.alert(
          'URL не настроен',
          'Настройте подключение в настройках',
          [
            { text: 'Настройки', onPress: () => router.push('/check_connect') },
            { text: 'OK', style: 'cancel' }
          ]
        );
        return;
      }
      
      const response = await fetch(`${currentUrl}/api/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
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
      console.error('❌ Ошибка проверки соединения:', error);
      Alert.alert('❌ Ошибка', 'Не удалось проверить соединение');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Кнопка назад */}
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

      {/* Скрытая кнопка проверки соединения (удерживать) */}
      <TouchableOpacity
        style={styles.testButton}
        onLongPress={handleTestConnection}
        delayLongPress={2000}
      >
        <Text style={styles.testButtonText}>🔗</Text>
      </TouchableOpacity>

      {/* Основной контент */}
      <View style={styles.content}>
        {/* Логотип */}
        <Text style={styles.logo}>Пингви</Text>

        {/* Заголовок */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Добро пожаловать!</Text>
          <Text style={styles.description}>
            Пожалуйста, введите логин и пароль,{'\n'}полученный в Telegram.
          </Text>
        </View>

        {/* Форма */}
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
  infoBox: {
    width: SCREEN_WIDTH - 22.5*2,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 10,
    marginTop: 5,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#6D0FAD',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 2,
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
  settingsLink: {
    marginTop: 15,
    padding: 10,
  },
  settingsLinkText: {
    fontSize: 14,
    color: '#8D41C1',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});