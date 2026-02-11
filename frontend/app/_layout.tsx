import { Stack } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Roboto-Regular': Roboto_400Regular,
    'Roboto-Medium': Roboto_500Medium,
    'Roboto-Bold': Roboto_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6D0FAD" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Основные экраны */}
      <Stack.Screen name="index" />                    {/* Проверка авторизации */}
      <Stack.Screen name="telegram-welcome" />         {/* Новый приветственный экран */}
      <Stack.Screen name="login" />                    {/* Экран входа */}
      <Stack.Screen name="login_for_child" />          {/* Вход по приглашению */}
      
      {/* Главный интерфейс после входа */}
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,  // Отключаем свайп назад
        }} 
      />
      
      {/* Старые экраны (можно оставить для совместимости) */}
      <Stack.Screen name="welcome_screen" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="create_task" />
    </Stack>
  );
}