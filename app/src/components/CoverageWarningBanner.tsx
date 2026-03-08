/**
 * CoverageWarningBanner — TG-Offline-4
 *
 * Replaces the plain ReconnectingBanner with a smarter signal-aware banner.
 * Shows different states for weak signal vs no signal, and includes elapsed
 * offline duration.
 *
 * Visual states:
 *   weak  → amber bar: "Weak signal — syncing less frequently"
 *   none  → solid danger bar: "No signal — showing cached locations"
 *
 * The dismiss button hides the banner visually but it always returns when
 * signal degrades again.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCoverageMonitor } from '../hooks/useCoverageMonitor';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

function formatOfflineDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} hr`;
}

export function CoverageWarningBanner(): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const { signalStrength, showCoverageWarning, offlineDurationSeconds } = useCoverageMonitor();

  // User can dismiss banner per signal episode; returns on next signal change
  const [dismissed, setDismissed] = useState(false);
  const [prevStrength, setPrevStrength] = useState(signalStrength);

  // Re-show when signal strength changes (new signal event)
  useEffect(() => {
    if (signalStrength !== prevStrength) {
      setDismissed(false);
      setPrevStrength(signalStrength);
    }
  }, [signalStrength, prevStrength]);

  const slideAnim = React.useRef(new Animated.Value(-60)).current;

  const shouldShow = showCoverageWarning && !dismissed;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: shouldShow ? 0 : -60,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [shouldShow, slideAnim]);

  const handleDismiss = useCallback(() => setDismissed(true), []);

  const isNone = signalStrength === 'none';

  const bannerColor = isNone
    ? colors.danger
    : 'rgba(232,161,0,0.95)'; // amber for weak

  const label = isNone
    ? offlineDurationSeconds >= 5
      ? `No signal — offline for ${formatOfflineDuration(offlineDurationSeconds)}`
      : 'No signal — showing cached locations'
    : 'Weak signal — syncing less frequently';

  const subLabel = isNone
    ? 'Showing last-known positions for offline riders'
    : offlineDurationSeconds >= 30
      ? `Offline for ${formatOfflineDuration(offlineDurationSeconds)}`
      : null;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top, transform: [{ translateY: slideAnim }] },
      ]}
      pointerEvents={shouldShow ? 'box-none' : 'none'}
    >
      <View style={[styles.banner, { backgroundColor: bannerColor }]}>
        <View style={styles.textBlock}>
          <Text style={styles.label}>{label}</Text>
          {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.dismissBtn}
        >
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  textBlock: {
    flex: 1,
  },
  label: {
    color: '#000',
    fontWeight: '700',
    fontSize: typography.sm,
  },
  subLabel: {
    color: 'rgba(0,0,0,0.65)',
    fontSize: typography.xs,
    marginTop: 1,
  },
  dismissBtn: {
    marginLeft: 12,
    padding: 4,
  },
  dismissText: {
    color: 'rgba(0,0,0,0.55)',
    fontSize: 16,
    fontWeight: '700',
  },
});
