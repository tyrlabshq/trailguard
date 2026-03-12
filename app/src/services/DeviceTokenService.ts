/**
 * DeviceTokenService.ts
 *
 * Captures the APNs (iOS) device token and upserts it to the Supabase
 * `device_tokens` table so the sos-push edge function can deliver remote
 * push notifications when the recipient's app is killed.
 *
 * Flow:
 *   1. App.tsx calls `initDeviceTokenService()` at startup.
 *   2. This module calls `registerForRemoteNotifications()` via the
 *      PushNotificationIOS bridge, which triggers the AppDelegate to request
 *      a token from APNs.
 *   3. AppDelegate.mm forwards the token to `RCTPushNotificationManager`,
 *      which fires the 'register' event that we listen for here.
 *   4. On receipt, we upsert { user_id, token, platform:'ios' } to
 *      `public.device_tokens` via Supabase.
 *   5. The service is a no-op on Android (FCM not yet integrated).
 *
 * ⚠️  REQUIRES Supabase secrets set before the edge function can send push:
 *     supabase secrets set APNS_KEY_ID=<10-char key id>
 *     supabase secrets set APNS_TEAM_ID=<10-char team id>
 *     supabase secrets set APNS_PRIVATE_KEY="$(cat AuthKey_XXXXXXXXXX.p8)"
 *     supabase secrets set APNS_BUNDLE_ID=com.trailguard.app
 *   See: supabase/functions/sos-push/README.md for setup instructions.
 */

import { Platform } from 'react-native';
// PushNotificationIOS is still shipped with react-native 0.73 (though
// deprecated); it provides the `register` event for the APNs device token.
// If the project migrates to @react-native-community/push-notification-ios
// in the future, swap this import — the API is identical.
import { PushNotificationIOS } from 'react-native';
import { supabase } from '../lib/supabase';

// ─── State ────────────────────────────────────────────────────────────────────

let _initialized = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/**
 * Upsert the device token to Supabase.
 * Uses `onConflict: 'user_id,platform'` so repeated calls (e.g. after
 * token refresh) simply update the token and bump `updated_at`.
 */
async function upsertDeviceToken(token: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) {
    // User not yet authenticated — token will be registered on next app open
    // after sign-in triggers re-registration via auth state change.
    console.warn('[DeviceTokenService] No authenticated user — skipping token upsert.');
    return;
  }

  const { error } = await supabase.from('device_tokens').upsert(
    {
      user_id: userId,
      token,
      platform: 'ios',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,platform' },
  );

  if (error) {
    console.warn('[DeviceTokenService] Token upsert failed:', error.message);
  } else {
    console.log('[DeviceTokenService] APNs token registered successfully.');
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the APNs device token registration flow.
 *
 * Call once from App.tsx (after `setupSOSNotificationChannel`).
 * Safe to call multiple times — idempotent.
 *
 * On iOS: registers the 'register' and 'registrationError' event listeners
 *   then calls `registerRemoteNotifications()` to request a fresh token.
 * On Android: no-op (FCM not yet integrated).
 */
export function initDeviceTokenService(): void {
  if (Platform.OS !== 'ios') return;
  if (_initialized) return;
  _initialized = true;

  // Listen for the APNs token delivered by AppDelegate →
  // RCTPushNotificationManager → PushNotificationIOS bridge
  PushNotificationIOS.addEventListener('register', (token: string) => {
    upsertDeviceToken(token).catch((err) => {
      console.warn('[DeviceTokenService] upsertDeviceToken error:', err);
    });
  });

  PushNotificationIOS.addEventListener('registrationError', (err) => {
    console.warn('[DeviceTokenService] APNs registration error:', err.message);
  });

  // Request the APNs token.  This is a lightweight system call — it does NOT
  // present a permission dialog; notification permission was already requested
  // by notifee.  If permission was denied, APNs silently skips registration.
  PushNotificationIOS.requestPermissions({
    alert: true,
    badge: true,
    sound: true,
  }).then(() => {
    // requestPermissions internally calls registerForRemoteNotifications on
    // the native side when permission is granted, triggering the 'register'
    // event above.
  }).catch((err) => {
    console.warn('[DeviceTokenService] requestPermissions error:', err);
  });
}

/**
 * Re-register the device token after sign-in.
 * Call this from your auth state change handler when a user signs in,
 * in case the token was captured before authentication was available.
 */
export function reregisterDeviceTokenAfterSignIn(): void {
  if (Platform.OS !== 'ios') return;

  // Re-trigger PushNotificationIOS.requestPermissions to fire the
  // 'register' event with the current cached token.
  PushNotificationIOS.requestPermissions({
    alert: true,
    badge: true,
    sound: true,
  }).catch((err) => {
    console.warn('[DeviceTokenService] reregister error:', err);
  });
}
