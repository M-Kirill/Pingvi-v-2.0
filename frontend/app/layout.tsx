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
        <ActivityIndicator size="large" color="#8D41C1" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="welcome_screen" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="create_task" />
      <Stack.Screen name="login_for_child" />
      
      {/* Добавляем экраны которые у вас уже есть */}
      <Stack.Screen name="telegram_welcome" />
      <Stack.Screen name="parent_profile" />
      <Stack.Screen name="rewards_screen" />
      <Stack.Screen name="tasks_for_child" />
      <Stack.Screen name="create_task_for_child" />
      <Stack.Screen name="statistic_screen" />
      <Stack.Screen name="check_connect" />
      <Stack.Screen name="test" />
    </Stack>
  );
}