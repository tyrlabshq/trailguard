/**
 * SOSNotificationService.ts
 *
 * Listens for incoming SOS alerts on the `sos:{groupId}` Supabase Realtime
 * channel and triggers in-app alerts + device vibration for group members.
 *
 * Architecture:
 *  - subscribeToGroupSOS(options)  — start listening (call on group join)
 *  - cancelGroupSOSSubscription()  — stop listening (call on group leave)
 *
 * Push notifications (background):
 *   For true background push when the app is closed, wire this up with a
 *   native notifications library such as @notifee/react-native. The in-app
 *   overlay + vibration path covers the foreground case fully.
 */

import { Platform, Vibration } from 'react-native';
import { subscribeToSOSAlerts, type SOSAlert } from '../api/sos';

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
   * Called when a *foreign* SOS arrives (i.e. from another group member).
   * The caller is responsible for showing the in-app overlay.
   */
  onIncomingAlert: (alert: SOSAlert) => void;
}

// ─── Module-level state (singleton subscription) ─────────────────────────────

let _unsubscribe: (() => void) | null = null;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Subscribe to SOS events for the given group.
 * Any previously active subscription is cancelled first.
 */
export function subscribeToGroupSOS(options: SOSSubscriptionOptions): void {
  // Always cancel previous subscription before starting a new one
  cancelGroupSOSSubscription();

  const { groupId, currentUserId, onIncomingAlert } = options;

  _unsubscribe = subscribeToSOSAlerts(groupId, (alert: SOSAlert) => {
    // Don't alert the sender — they already know they pressed SOS
    if (alert.user_id === currentUserId) return;

    // Only trigger for active alerts (not cancellations)
    if (alert.status !== 'active') return;

    // Aggressive vibration pattern to grab attention in a noisy environment
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 600, 200, 600, 200, 600, 200, 1200]);
    }

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
 * formatSOSAlertText(alert) // "📍 44.98765, -84.12345"
 */
export function formatSOSCoords(alert: SOSAlert): string {
  return `📍 ${alert.lat.toFixed(5)}, ${alert.lng.toFixed(5)}`;
}
