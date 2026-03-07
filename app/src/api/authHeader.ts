import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Returns the Authorization header for authenticated API calls.
 * Reads the JWT stored by OnboardingScreen after guest login.
 */
export async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await AsyncStorage.getItem('auth_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
