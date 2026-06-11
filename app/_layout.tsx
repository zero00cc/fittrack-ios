import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '../context/AuthContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// Redirects based on auth state
function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Not signed in — send to login
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Already signed in — send to app
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  return null;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => { if (error) throw error; }, [error]);
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <AuthGate />
      <Stack>
        <Stack.Screen name="(tabs)"            options={{ headerShown: false }} />
        <Stack.Screen name="(auth)"            options={{ headerShown: false }} />
        <Stack.Screen name="modal"             options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="calorie-settings"
          options={{
            title:            'Profile & Settings',
            headerStyle:      { backgroundColor: '#FCFBEA' },
            headerTintColor:  '#37260C',
            headerTitleStyle: { fontWeight: '700' },
            headerBackTitle:  '',
          }}
        />
        <Stack.Screen
          name="calorie-onboarding"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="calorie-result"
          options={{
            presentation:   'modal',
            title:          'Meal Details',
            headerStyle:    { backgroundColor: '#FCFBEA' },
            headerTintColor: '#37260C',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <Stack.Screen
          name="calorie-progress"
          options={{
            title:            'Progress & History',
            headerStyle:      { backgroundColor: '#FCFBEA' },
            headerTintColor:  '#37260C',
            headerTitleStyle: { fontWeight: '700' },
            headerBackTitle:  '',
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
