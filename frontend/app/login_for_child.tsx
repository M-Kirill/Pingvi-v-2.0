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
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ChildLogin() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleContinue = async () => {
    if (!login.trim() || !password.trim()) {
      alert('Введите логин и пароль');
      return;
    }

    try {
      await AsyncStorage.setItem('user', JSON.stringify({
        login,
        name: 'Ребенок Пингви',
        isChild: true
      }));
      router.replace('/tasks_for_child');
    } catch (error) {
      console.log('Error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Изображение пингвина */}
          <View style={styles.penguinContainer}>
            <Image
              source={require('../assets/pingu.png')}
              style={styles.penguinImage}
              resizeMode="contain"
            />
          </View>

          {/* Заголовок */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Привет!</Text>
            <Text style={styles.description}>
              Семейный доступ открыт — время работать еще эффективнее!
            </Text>
          </View>

          {/* Форма */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Логин"
                placeholderTextColor="#BDBDBD"
                value={login}
                onChangeText={setLogin}
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Пароль"
                placeholderTextColor="#BDBDBD"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.continueButton,
                (login && password)
                  ? styles.continueButtonActive
                  : styles.continueButtonInactive
              ]}
              onPress={handleContinue}
              disabled={!login || !password}
            >
              <Text style={[
                styles.continueButtonText,
                (login && password)
                  ? styles.continueButtonTextActive
                  : styles.continueButtonTextInactive
              ]}>
                Войти
              </Text>
            </TouchableOpacity>

            {/* Текст соглашения */}
            <View style={styles.agreementContainer}>
              <Text style={styles.agreementText}>
                Нажимая на кнопку войти, вы соглашаетесь с условиями и офертой
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 61,
  },
  penguinContainer: {
    marginBottom: -5,
  },
  penguinImage: {
    width: 400,
    height: 400,
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
    marginBottom: 5,
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: '#373635',
    lineHeight: 20,
    letterSpacing: 0.25,
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
    marginBottom: 10,
    position: 'relative',
  },
  input: {
    fontSize: 14,
    color: '#373635',
    padding: 0,
    width: '100%',
    paddingRight: 40,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    padding: 10,
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
  agreementContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  agreementText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
});