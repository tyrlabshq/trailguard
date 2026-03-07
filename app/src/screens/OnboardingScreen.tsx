import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8420';

interface Props {
  onAuthenticated: () => void;
}

export default function OnboardingScreen({ onAuthenticated }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert('Too short', 'Enter at least 2 characters for your display name.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? `Auth failed: ${res.status}`);
      }

      const { accessToken } = await res.json();
      await AsyncStorage.setItem('auth_token', accessToken);
      onAuthenticated();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not connect to server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🏔️</Text>
        <Text style={styles.title}>TrailGuard</Text>
        <Text style={styles.subtitle}>Ride together. Stay safe.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>What should we call you?</Text>
          <TextInput
            style={styles.input}
            placeholder="Display name"
            placeholderTextColor={colors.textDim}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleStart}
            maxLength={40}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleStart}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Start Riding →</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>No account needed. Just pick a name.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textDim,
    marginBottom: 40,
    marginTop: 4,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.textDim,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  hint: {
    marginTop: 24,
    fontSize: 13,
    color: colors.textDim,
  },
});
