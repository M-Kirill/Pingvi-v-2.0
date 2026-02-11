import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Linking,
  Alert,
  ActivityIndicator
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

import penguinImage from "../assets/pingu.png";
import { authService } from "../services/auth";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function TelegramWelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(false);

  // При загрузке экрана проверяем, авторизован ли пользователь
  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      console.log("🔍 Проверка существующей авторизации...");
      
      // Проверяем наличие токена
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('auth_user');
      
      if (token && userData) {
        console.log("Найден токен, проверяем...");
        setCheckingAuth(true);
        
        try {
          // Пытаемся проверить токен на сервере
          const isValid = await authService.validateToken();
          
          if (isValid) {
            console.log("Токен рабочий, переход на welcome_screen");
            router.replace('/welcome_screen');
            return;
          } else {
            console.log("Токен не рабочий, очищаем данные");
            await authService.logout();
          }
        } catch (error) {
          console.log("⚠️ Ошибка проверки токена, используем локальные данные:", error);
          // Если не удалось проверить, но есть данные - все равно переходим
          const user = JSON.parse(userData);
          if (user && user.login) {
            console.log("Используем локальные данные пользователя");
            router.replace('/welcome_screen');
            return;
          }
        }
      } else {
        console.log("Токен не найден, показываем экран приветствия");
      }
    } catch (error) {
      console.error("Ошибка при проверке авторизации:", error);
    } finally {
      setLoading(false);
      setCheckingAuth(false);
    }
  };

  const handleTelegramLogin = () => {
    // Открываем Telegram бота
    const botUrl = "https://t.me/pengui_family_bot";
    Linking.openURL(botUrl).catch(() => {
      Alert.alert("Ошибка", "Не удалось открыть Telegram");
    });

    // Показываем инструкцию и переходим на экран логина
    Alert.alert(
      "Откройте Telegram бота",
      "1. В Telegram нажмите START\n2. Скопируйте логин и пароль\n3. Вернитесь в приложение",
      [
        {
          text: "Я получил данные",
          onPress: () => router.push("/login")
        },
        {
          text: "Отмена",
          style: "cancel"
        }
      ]
    );
  };

  const handleInviteLogin = async () => {
    router.push("/login_for_child");
  };

  // Скрытая функция для разработки (удерживать кнопку 3 секунды)
  const handleTestMode = () => {
    Alert.alert(
      "Режим разработчика",
      "Выберите действие:",
      [
        {
          text: "Тестовый вход",
          onPress: () => {
            Alert.prompt(
              "Тестовый вход",
              "Введите тестовый логин:",
              [
                { text: "Отмена", style: "cancel" },
                { 
                  text: "Войти", 
                  onPress: async (login) => {
                    if (login) {
                      setLoading(true);
                      try {
                        // Используем стандартный пароль для теста
                        const result = await authService.login(
                          login.trim(), 
                          "test123", 
                          "iOS Test Mode"
                        );
                        
                        if (result.success) {
                          Alert.alert("Успех", "Тестовый вход выполнен!");
                          router.replace('/welcome_screen');
                        } else {
                          Alert.alert("Ошибка", result.message || "Неверные данные");
                        }
                      } catch (error: any) {
                        Alert.alert("Ошибка", error.message);
                      } finally {
                        setLoading(false);
                      }
                    }
                  }
                }
              ],
              "plain-text"
            );
          }
        },
        {
          text: "Проверить соединение",
          onPress: async () => {
            setLoading(true);
            try {
              const connected = await authService.testConnection();
              Alert.alert(
                connected ? "✅ Соединение установлено" : "❌ Нет соединения",
                connected 
                  ? "API сервер доступен" 
                  : "Не удалось подключиться к серверу. Проверьте что бэкенд запущен."
              );
            } catch (error: any) {
              Alert.alert("Ошибка", error.message);
            } finally {
              setLoading(false);
            }
          }
        },
        {
          text: "Очистить данные",
          onPress: async () => {
            await authService.logout();
            Alert.alert("✅", "Данные очищены");
          }
        },
        {
          text: "Отмена",
          style: "cancel"
        }
      ]
    );
  };

  // Показываем индикатор загрузки при проверке авторизации
  if (loading || checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6D0FAD" />
        <Text style={styles.loadingText}>
          {checkingAuth ? "Проверка авторизации..." : "Загрузка..."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Скрытая кнопка для режима разработчика (в правом верхнем углу) */}
      <TouchableOpacity 
        style={styles.devButton}
        onLongPress={handleTestMode}
        delayLongPress={1000}
      >
        <Text style={styles.devButtonText}>⚙️</Text>
      </TouchableOpacity>

      <View style={styles.penguinContainer}>
        <Image
          source={penguinImage}
          style={styles.penguinImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Привет!</Text>
          <Text style={styles.description}>
            Планируй время, выполняй задачи и получай награды вместе с семьей.
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.buttonWrapper}
            onPress={handleTelegramLogin}
            activeOpacity={0.8}
            disabled={loading}
          >
            <LinearGradient
              colors={['#6D0FAD', '#B667C4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.gradientButton, loading && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>Войти через Telegram</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonWrapper}
            onPress={handleInviteLogin}
            activeOpacity={0.8}
            disabled={loading}
          >
            <LinearGradient
              colors={['#6D0FAD', '#B667C4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.gradientButton, loading && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>Войти по приглашению</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.agreementContainer}>
            <Text style={styles.agreementText}>
              Нажимая на кнопку войти, вы соглашаетесь с условиями и офертой
            </Text>
           
          </View>
        </View>
      </View>
    </View>
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
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#6D0FAD',
    fontWeight: '500',
  },
  devButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(109, 15, 173, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  devButtonText: {
    fontSize: 18,
  },
  penguinContainer: {
    position: 'absolute',
    top: 0,
    right: -50,
    width: SCREEN_WIDTH * 1.05,
    height: SCREEN_HEIGHT * 0.75,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  penguinImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.1 }],
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  textContainer: {
    marginBottom: 30,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#373635',
    marginBottom: 12,
    textAlign: 'left',
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
    lineHeight: 22,
    letterSpacing: 0.25,
    textAlign: 'left',
    paddingHorizontal: 0,
  },
  buttonsContainer: {
    alignItems: 'center',
    gap: 14,
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#6D0FAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradientButton: {
    width: '100%',
    height: 43,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  agreementContainer: {
    marginTop: 25,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  agreementText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  helpLink: {
    padding: 8,
    marginTop: 10,
  },
  helpLinkText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6D0FAD',
    textDecorationLine: 'underline',
  },
});