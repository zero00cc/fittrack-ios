import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode]       = useState<'login' | 'register'>('login');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    const fn = mode === 'login' ? signIn : signUp;
    const { error: authError } = await fn(email.trim(), password);
    setLoading(false);
    if (authError) {
      setError(authError);
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🏋️</Text>
        <Text style={styles.title}>FitTrack</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.btn}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          style={styles.switchBtn}
        >
          <Text style={styles.switchText}>
            {mode === 'login'
              ? "Don't have an account? Register"
              : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#f9fafb' },
  inner:      { flex: 1, justifyContent: 'center', padding: 28 },
  logo:       { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  title:      { fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle:   { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 32, marginTop: 4 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
  },
  error:      { color: '#ef4444', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  btn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchBtn:  { marginTop: 20, alignItems: 'center' },
  switchText: { color: '#10b981', fontSize: 14, fontWeight: '600' },
});
