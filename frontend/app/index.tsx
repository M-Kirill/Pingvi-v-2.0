import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem('current_user');

      // ���� ��������� �������� ��� ���������
      setTimeout(() => {
        if (userData) {
          // ������������ ��� ���������������, �������������� �� ������
          router.replace('/tasks');
        } else {
          // ������������ �� ���������������, ���������� �����������
          router.replace('/telegram_welcome');
        }
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.log('Error checking auth:', error);
      router.replace('/welcome_screen');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6D0FAD" />
      </View>
    );
  }

  return null;
}