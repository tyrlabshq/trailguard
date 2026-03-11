/**
 * SOSNotificationService.ts
 *
 * Listens for incoming SOS alerts on the `sos:{groupId}` Supabase Realtime
 * channel and triggers in-app alerts + device vibration for group members.
 *
 * Background push: Uses @notifee/react-native to fire a high-priority local
 * notification so riders are alerted even when the app is backgrounded or closed.
 *
 * Architecture:
 *  - setupSOSNotificationChannel() — call once at app startup to register the
 *      Android notification channel (no-op on iOS)
 *  - subscribeToGroupSOS(options)  — start listening (call on group join)
 *  - cancelGroupSOSSubscription()  — stop listening (call on group leave)
 */

import { Platform, Vibration } from 'react-native';
import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AndroidCategory,
  AndroidLaunchActivityFlag,
} from '@notifee/react-native';
import { subscribeToSOSAlerts, type SOSAlert } from '../api/sos';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Android notification channel id for SOS alerts. */
export const SOS_CHANNEL_ID = 'sos-alerts';

/** Notifee action id for the "CALL" quick action. */
export const SOS_ACTION_CALL = 'sos_call';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SOSSubscriptionOptions {
  /** Group to watch. */
  groupId: string;
  /** Human-readable group name (used in notification text). */
  groupName: string;
  /**
   * Auth UUID of the current user — used to filter out our own SOS
   * broadcasts so the sender doesn't see their own alert overlay.
   */
  currentUserId: string | null;
  /**
   * Optional lookup function that returns the display name and phone number
   * for any group member by their auth UUID.  Called at alert-receive time so
   * the push notification can say "<riderName> needs help!" and surface a
   * CALL button when a phone number is known.
   *
   * Return null / undefined when no profile is available for that user.
   */
  getMemberInfo?: (userId: string) => { name: string | null; phone: string | null } | null;
  /**
   * Called when a *foreign* SOS arrives (i.e. from another group member).
   * The caller is responsible for showing the in-app overlay.
   */
  onIncomingAlert: (alert: SOSAlert) => void;
}

// ─── Module-level state (singleton subscription) ─────────────────────────────

let _unsubscribe: (() => void) | null = null;

// ─── Channel setup ───────────────────────────────────────────────────────────

/**
 * Create (or update) the Android "SOS Alerts" notification channel.
 * Must be called once at app startup before any SOS notification is fired.
 * Safe to call multiple times — notifee is idempotent on channel creation.
 * No-op on iOS (channels are Android-only; iOS settings are per-notification).
 */
export async function setupSOSNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await notifee.createChannel({
    id: SOS_CHANNEL_ID,
    name: 'SOS Alerts',
    description: 'Critical alerts when a group rider triggers an SOS.',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    // Allow sound + vibration even in DND
    bypassDnd: true,
    lights: true,
    lightColor: '#FF0000',
    vibration: true,
    vibrationPattern: [300, 600, 300, 600, 300, 1200],
    sound: 'default',
  });
}

// ─── Internal: fire notification ─────────────────────────────────────────────

async function _fireSOSNotification(
  alert: SOSAlert,
  riderName?: string | null,
  riderPhone?: string | null,
): Promise<void> {
  // Request permissions on first call (iOS prompts; Android 13+ prompts)
  await notifee.requestPermission();

  const displayName = riderName ?? 'A group member';
  const coordsText = `${alert.lat.toFixed(5)}, ${alert.lng.toFixed(5)}`;

  const timestampStr = alert.timestamp
    ? new Date(alert.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const bodyAndroid = [
    `📍 ${coordsText}`,
    timestampStr ? `⏱ ${timestampStr}` : null,
  ]
    .filter(Boolean)
    .join('  •  ');

  const bodyIOS = [
    `📍 ${coordsText}`,
    timestampStr ? `⏱ ${timestampStr}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  if (Platform.OS === 'android') {
    // Build the CALL action only when a phone number is available
    const actions = riderPhone
      ? [
          {
            id: SOS_ACTION_CALL,
            title: '📞  CALL RIDER',
            pressAction: {
              id: SOS_ACTION_CALL,
              launchActivity: 'default',
              launchActivityFlags: [AndroidLaunchActivityFlag.SINGLE_TOP],
            },
          },
        ]
      : [];

    await notifee.displayNotification({
      title: `🚨 SOS — ${displayName} needs help!`,
      body: bodyAndroid,
      android: {
        channelId: SOS_CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        category: AndroidCategory.ALARM,
        // Full-screen intent — shows even on lock screen
        fullScreenAction: {
          id: 'default',
          launchActivityFlags: [AndroidLaunchActivityFlag.SINGLE_TOP],
        },
        color: '#FF0000',
        colorized: true,
        sound: 'default',
        vibrationPattern: [300, 600, 300, 600, 300, 1200],
        lights: ['#FF0000', 500, 500],
        actions,
      },
    });
  } else {
    // iOS
    await notifee.displayNotification({
      title: `🚨 SOS — ${displayName} needs help!`,
      body: bodyIOS,
      ios: {
        // Critical alert bypasses mute / Do Not Disturb
        // (requires Apple entitlement — degrades gracefully without it)
        critical: true,
        criticalVolume: 1.0,
        sound: 'default',
        foregroundPresentationOptions: {
          badge: true,
          sound: true,
          banner: true,
          list: true,
        },
        categoryId: riderPhone ? 'SOS_WITH_CALL' : 'SOS',
      },
    });
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Subscribe to SOS events for the given group.
 * Any previously active subscription is cancelled first.
 */
export function subscribeToGroupSOS(options: SOSSubscriptionOptions): void {
  // Always cancel previous subscription before starting a new one
  cancelGroupSOSSubscription();

  const { groupId, currentUserId, getMemberInfo, onIncomingAlert } = options;

  _unsubscribe = subscribeToSOSAlerts(groupId, (alert: SOSAlert) => {
    // Don't alert the sender — they already know they pressed SOS
    if (alert.user_id === currentUserId) return;

    // Only trigger for active alerts (not cancellations)
    if (alert.status !== 'active') return;

    // Resolve sender's name + phone from the caller-supplied lookup (dynamic,
    // supports multi-member groups where any rider could send the SOS).
    const memberInfo = getMemberInfo?.(alert.user_id) ?? null;
    const riderName = memberInfo?.name ?? null;
    const riderPhone = memberInfo?.phone ?? null;

    // Aggressive vibration pattern to grab attention in a noisy environment
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 600, 200, 600, 200, 600, 200, 1200]);
    }

    // Fire background/foreground push notification via notifee
    _fireSOSNotification(alert, riderName, riderPhone).catch((err) => {
      console.warn('[SOSNotificationService] notifee error:', err);
    });

    // Delegate overlay rendering to the caller (MapScreen)
    onIncomingAlert(alert);
  });
}

/**
 * Unsubscribe from the current group SOS channel.
 * Safe to call even when no subscription is active.
 */
export function cancelGroupSOSSubscription(): void {
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }
}

/**
 * Build a human-readable label for an incoming SOS alert.
 * Exported for use in overlay components.
 *
 * @example
 * formatSOSCoords(alert) // "📍 44.98765, -84.12345"
 */
export function formatSOSCoords(alert: SOSAlert): string {
  return `📍 ${alert.lat.toFixed(5)}, ${alert.lng.toFixed(5)}`;
}
