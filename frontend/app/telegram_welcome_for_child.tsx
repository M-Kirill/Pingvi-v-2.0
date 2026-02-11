import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

export default function Screen() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Проверяем аутентификацию при загрузке экрана
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('current_user');
      
      if (token && userData) {
        setIsAuthenticated(true);
        console.log("Пользователь авторизован");
      } else {
        setIsAuthenticated(false);
        Alert.alert(
          "Требуется авторизация",
          "Для добавления ребенка необходимо войти в систему",
          [
            {
              text: "Войти",
              onPress: () => router.push("/login")
            },
            {
              text: "Отмена",
              style: "cancel",
              onPress: () => router.back()
            }
          ]
        );
      }
    } catch (error) {
      console.error("Ошибка проверки авторизации:", error);
    }
  };

  const handleSubmit = async () => {
    // Проверки
    if (!name.trim()) {
      Alert.alert("Ошибка", "Введите имя ребенка");
      return;
    }

    if (age && (parseInt(age) < 1 || parseInt(age) > 18)) {
      Alert.alert("Ошибка", "Возраст должен быть от 1 до 18 лет");
      return;
    }

    // Проверяем аутентификацию перед отправкой
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      Alert.alert(
        "Требуется авторизация",
        "Для добавления ребенка необходимо войти в систему",
        [
          {
            text: "Войти",
            onPress: () => router.push("/login")
          },
          {
            text: "Отмена",
            style: "cancel"
          }
        ]
      );
      return;
    }

    setIsLoading(true);
    
    try {
      console.log("Создание ребенка:", { name, age });
      console.log("Используемый токен:", token ? "Есть" : "Нет");
      
      // Проверяем валидность токена перед отправкой
      const validateResponse = await fetch('http://192.168.0.30:8000/api/auth/validate', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!validateResponse.ok) {
        // Токен невалиден, просим войти заново
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('current_user');
        
        Alert.alert(
          "Сессия истекла",
          "Ваша сессия истекла. Пожалуйста, войдите снова.",
          [
            {
              text: "Войти",
              onPress: () => {
                router.replace("/login");
              }
            }
          ]
        );
        setIsLoading(false);
        return;
      }

      // Токен валиден, отправляем данные ребенка НА ПРАВИЛЬНЫЙ ЭНДПОИНТ
      const response = await fetch('http://192.168.50.171:8000/api/children/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          age: age ? parseInt(age) : null
        }),
      });

      const data = await response.json();
      console.log("Ответ сервера:", data);
      
      if (response.ok && data.success) {
        Alert.alert(
          "Успешно! 🎉",
          `Аккаунт для ребенка "${name}" создан!\n\n` +
          `Данные для входа (логин и пароль) отправлены вам в Telegram.\n\n` +
          `Что делать дальше:\n` +
          `1. Проверьте сообщения от @pingvi_family_bot\n` +
          `2. Скопируйте логин и пароль ребенка\n` +
          `3. Ребенок может войти в приложение\n` +
          `4. Создавайте задачи для ребенка`,
          [
            { 
              text: "Создать задачу",
              onPress: () => {
                // Переходим на экран создания задачи
                router.push("/create_task_for_child");
              }
            },
            { 
              text: "Вернуться назад",
              style: "cancel",
              onPress: () => {
                setName("");
                setAge("");
                router.back();
              }
            }
          ]
        );
      } else {
        const errorMessage = data.detail || data.message || "Не удалось создать аккаунт ребенка";
        Alert.alert("Ошибка", errorMessage);
        
        // Если ошибка 401 (Unauthorized), удаляем токен
        if (response.status === 401) {
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('current_user');
          Alert.alert(
            "Сессия истекла",
            "Пожалуйста, войдите снова.",
            [
              {
                text: "Войти",
                onPress: () => router.replace("/login")
              }
            ]
          );
        }
      }
      
    } catch (error) {
      console.error("Ошибка:", error);
      Alert.alert(
        "Ошибка подключения",
        "Не удалось подключиться к серверу. Проверьте:\n\n" +
        "1. Подключение к интернету\n" +
        "2. Что сервер запущен (192.168.0.30:8000)\n" +
        "3. Что вы в той же Wi-Fi сети"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const navigateBack = () => {
    router.push("/welcome_screen");
  };

  // Если не авторизован, показываем сообщение
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8D41C0" />
          <Text style={styles.loadingText}>Проверка авторизации...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Кнопка назад */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={navigateBack}
        activeOpacity={0.7}
      >
        <Image
          source={require("../assets/back.png")}
          style={styles.backIcon}
        />
      </TouchableOpacity>

      {/* Заголовок */}
      <View style={styles.header}>
        <Text style={styles.appName}>Пингви</Text>
      </View>

      <View style={styles.content}>
        {/* Секция с формой */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Добавить ребенка</Text>
          <Text style={styles.sectionDescription}>
            После создания аккаунта, логин и пароль ребенка будут отправлены вам в Telegram.
            Ребенок сможет войти в приложение под своим аккаунтом.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Имя ребенка"
                placeholderTextColor="#999"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="Возраст"
                placeholderTextColor="#999"
                keyboardType="numeric"
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!name.trim() || isLoading}
              style={[styles.submitButton, (!name.trim() || isLoading) && styles.disabledButton]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#6D0FAD", "#B667C4"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Создать аккаунт ребенка</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Информация под кнопкой */}
 
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    minHeight: 812,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: "#666",
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 70 : 20,
    left: 15,
    width: 30,
    height: 30,
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    width: 30,
    height: 30,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 30,
    paddingBottom: 20,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  appName: {
    fontSize: 40,
    fontFamily: Platform.OS === "ios" ? "Helvetica-Black" : "sans-serif-black",
    fontWeight: "900",
    color: "#8D41C0",
    letterSpacing: -0.8,
  },
  content: {
    paddingHorizontal: 23,
  },
  section: {
    marginTop: 30,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: Platform.OS === "ios" ? "Helvetica-Bold" : "sans-serif-medium",
    fontWeight: "600",
    color: "#373635",
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Helvetica" : "sans-serif",
    color: "#373635",
    lineHeight: 18,
    marginBottom: 30,
  },
  form: {
    gap: 14,
  },
  inputContainer: {
    height: 43,
    borderWidth: 1,
    borderColor: "#BDBDBD",
    borderRadius: 23,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "SFProDisplay-Regular" : "sans-serif",
    color: "#333333",
  },
  submitButton: {
    height: 43,
    borderRadius: 23,
    overflow: "hidden",
    marginTop: 10,
  },
  gradientButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Helvetica-Medium" : "sans-serif-medium",
    fontWeight: "500",
    color: "#FFFFFF",
    textAlign: "center",
  },
  noteContainer: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#6D0FAD",
  },
  noteText: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Helvetica" : "sans-serif",
    color: "#6C757D",
    lineHeight: 16,
  },
});