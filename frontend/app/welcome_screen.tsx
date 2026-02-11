import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

import penguinImage from '../assets/pingu.png';
import backArrowImage from "../assets/back.png";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();

  const handleBackPress = () => {
    Alert.alert(
      "Выход",
      "Вы хотите выйти из аккаунта?",
      [
        {
          text: "Отмена",
          style: "cancel"
        },
        {
          text: "Выйти",
          style: "destructive",
          onPress: async () => {
            // Очищаем данные авторизации
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('auth_user');
            console.log("✅ Данные очищены, возврат на telegram_welcome");
            router.replace('/telegram_welcome');
          }
        }
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Кнопка назад с выходом из аккаунта */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackPress}
      >
        <Image
          source={backArrowImage}
          style={styles.backIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Логотип */}
      <Text style={styles.logo}>Пингви</Text>

      {/* Изображение пингвина */}
      <View style={styles.penguinContainer}>
        <Image
          source={penguinImage}
          style={styles.penguinImage}
          resizeMode="contain"
        />
      </View>

      {/* Основной контент */}
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Привет!</Text>
          <Text style={styles.description}>
            Я Пингви — твой помощник в семейных делах! Помогаю организовать повседневные задачи, следить за прогрессом и радоваться успехам вместе с ребёнком.
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/telegram_welcome_for_child")}
          >
            <Text style={styles.primaryButtonText}>Добавить ребенка</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace("/tasks")}
          >
            <Text style={styles.secondaryButtonText}>Настроить позже</Text>
          </TouchableOpacity>
          
          {/* Дополнительная кнопка выхода внизу */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleBackPress}
          >
            <Text style={styles.logoutButtonText}>Выйти из аккаунта</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: SCREEN_HEIGHT,
  },
  backButton: {
    position: 'absolute',
    left: 15,
    top: 75,
    width: 28,
    height: 28,
    zIndex: 10,
  },
  backIcon: {
    width: 28,
    height: 28,
  },
  logo: {
    position: 'absolute',
    top: 61,
    alignSelf: 'center',
    fontSize: 40,
    fontWeight: '900',
    color: '#8D41C1',
    letterSpacing: -0.8,
  },
  penguinContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT -287-139,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT * 0.12,
    marginBottom: 10,
  },
  penguinImage: {
    width: SCREEN_WIDTH * 0.95,
    height: '100%',
    maxWidth: 350,
    maxHeight: 350,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 44,
    justifyContent: 'flex-end',
  },
  textContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#373635',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: '#373635',
    lineHeight: 18,
    letterSpacing: 0.25,
  },
  buttonsContainer: {
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  primaryButton: {
    width: SCREEN_WIDTH - 48,
    height: 45,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8D41C1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  secondaryButton: {
    padding: 0,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#BDBDBD',
    textDecorationLine: 'underline',
  },
  logoutButton: {
    marginTop: 30,
    padding: 10,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF3B30',
    textDecorationLine: 'underline',
  },
});