import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import 'react-native-url-polyfill/auto';

export default function RootLayout() {
  const [loaded] = useFonts({});

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#052E16' }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#052E16' },
          headerTintColor: '#D4AF37',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#052E16' }
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ title: 'Germanium Admin', headerBackVisible: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
