import AnimatedSplash from '@/components/AnimatedSplash';
import ThemeToggle from '@/components/ThemeToggle';
import Colors from '@/constants/Colors';
import { CartProvider } from '@/context/CartContext';
import { ThemeProvider as CustomThemeProvider, useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { CompanyProvider } from '../context/CompanyContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.card,
    text: Colors.light.text,
    border: Colors.light.border,
    primary: Colors.light.tint,
  },
};

const AppDarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    border: Colors.dark.border,
    primary: Colors.dark.tint,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // if (!loaded) {
  //   return null; // wait until fonts are ready
  // }

  return (
    <CustomThemeProvider>
      <RootLayoutNav />
    </CustomThemeProvider>
  );
}

function RootLayoutNav() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const employeeName = await AsyncStorage.getItem('employee_name');
        console.log('Employee found:', employeeName);
      } catch (e) {
        console.log('Error reading AsyncStorage');
      }
      setShowSplash(false); // hide custom splash
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return <StackContent showSplash={showSplash} />;
}

function StackContent({ showSplash }: { showSplash: boolean }) {
  const { theme } = useTheme();

  return (
    <ThemeProvider value={theme === 'dark' ? AppDarkTheme : LightTheme}>
      {showSplash ? (
        <AnimatedSplash />
      ) : (
        <CompanyProvider>
          <CartProvider>
            <Stack
              screenOptions={{
                animation: 'fade',
                headerStyle: { backgroundColor: Colors[theme].navBar },
                headerTintColor: '#fff',
                headerRight: () => <ThemeToggle />,
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="cart" options={{ title: 'Cart' }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              <Stack.Screen name="parties" options={{ title: 'Parties' }} />
              <Stack.Screen name="ledgers" options={{ title: 'Ledgers' }} />
            </Stack>
          </CartProvider>
        </CompanyProvider>
      )}
    </ThemeProvider>
  );
}