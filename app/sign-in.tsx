import { Text, useThemeColor, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { employeeSignIn } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

export default function SignInScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [employeeName, setEmployeeName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = Colors[theme];
  const borderColor = useThemeColor({}, 'tabIconDefault');

  // Animation values
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.9)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const formTranslateY = useRef(new Animated.Value(40)).current;

  // Trigger animations on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(contentScale, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.timing(titleTranslateY, { toValue: 0, duration: 700, delay: 100, useNativeDriver: true }).start();
    Animated.timing(formTranslateY, { toValue: 0, duration: 700, delay: 200, useNativeDriver: true }).start();
  }, [contentOpacity, contentScale, titleTranslateY, formTranslateY]);

  const handleSignIn = async () => {
    // Validation
    if (!employeeName.trim()) {
      setError('Please enter employee name');
      return;
    }
    
    const phoneClean = phone.replace(/\D+/g, '');
    if (!phoneClean.match(/^\d{10}$/)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call API to verify employee
      const resp = await employeeSignIn(phoneClean);
      
      // Save to localStorage
      await AsyncStorage.setItem('employee_name', employeeName);
      await AsyncStorage.setItem('employee_phone', phoneClean);
      await AsyncStorage.setItem('employee_token', resp?.token || resp?.id || phoneClean);

      // Navigate to dashboard
      router.replace('/(tabs)/dashboard');
    } catch (e) {
      setError('Sign-in failed. Please check your details and try again.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={theme === 'dark' ? ['#780206', '#061161'] : ['#005C97', '#363795']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.content, 
            { 
              opacity: contentOpacity, 
              transform: [{ scale: contentScale }] 
            }
          ]}
        >
          <View style={styles.header}>
            <Image
              source={require('../assets/images/splash-icon.png')}
              style={styles.headerIcon}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>Cochin Traders</Text>
          </View>

          <Animated.View style={[{ transform: [{ translateY: titleTranslateY }] }]}>
            <Text style={styles.subtitle}>Employee Sign In</Text>
          </Animated.View>

          <Animated.View 
            style={[
              styles.form, 
              { transform: [{ translateY: formTranslateY }] }
            ]}
          >
          <TextInput
            style={[
              styles.input,
              {
                color: '#000000',
                borderColor: 'transparent',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              },
            ]}
            placeholder="Employee Name"
            placeholderTextColor="#666666"
            value={employeeName}
            onChangeText={(text) => {
              setEmployeeName(text);
              setError(null);
            }}
            editable={!loading}
          />

          <TextInput
            style={[
              styles.input,
              {
                color: '#000000',
                borderColor: 'transparent',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              },
            ]}
            placeholder="Phone Number"
            placeholderTextColor="#666666"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              setError(null);
            }}
            maxLength={14}
            editable={!loading}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                opacity: loading ? 0.6 : 1,
              },
            ]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Signing In...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: 'transparent',
  },
  headerIcon: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 32,
    color: '#ffffff',
    textAlign: 'center',
  },
  form: {
    width: '100%',
    paddingHorizontal: 16,
  },
  input: {
    borderWidth: 0,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#000000',
  },
  errorText: {
    color: '#ffcccc',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  submitButtonText: {
    color: '#061161',
    fontSize: 16,
    fontWeight: '700',
  },
});
