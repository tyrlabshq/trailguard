import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

export interface RecentRide {
  id: string;
  date: string;     // e.g. "March 6"
  duration: string; // e.g. "2h 14m"
  distance: string; // e.g. "47mi"
}

interface HomeOverlayProps {
  visible: boolean;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  onSoloRide: () => void;
  recentRides: RecentRide[];
  satelliteStatus: 'connected' | 'searching' | 'unavailable';
  meshPeers: number;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PANEL_HEIGHT = Math.round(SCREEN_HEIGHT * 0.47);

export default function HomeOverlay({
  visible,
  onCreateGroup,
  onJoinGroup,
  onSoloRide,
  recentRides,
  satelliteStatus,
  meshPeers,
}: HomeOverlayProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(PANEL_HEIGHT)).current;
  const dimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: visible ? 0 : PANEL_HEIGHT,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
        mass: 0.9,
      }),
      Animated.timing(dimOpacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateY, dimOpacity]);

  const satLabel =
    satelliteStatus === 'connected' ? 'SAT OK' :
    satelliteStatus === 'searching' ? 'SAT SEARCHING' : 'NO SAT';

  const satColor =
    satelliteStatus === 'connected' ? colors.success :
    satelliteStatus === 'searching' ? colors.warning : colors.textMuted;

  const meshColor = meshPeers > 0 ? colors.accent : colors.textMuted;
  const meshLabel = meshPeers > 0 ? `MESH ${meshPeers}P` : 'NO MESH';

  return (
    <>
      {/* Map dim overlay — not interactive */}
      <Animated.View
        pointerEvents="none"
        style={[styles.dimOverlay, { opacity: dimOpacity }]}
      />

      {/* Slide-up bottom panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            transform: [{ translateY }],
            paddingBottom: insets.bottom + 12,
          },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        {/* Wordmark */}
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>TRAILGUARD</Text>
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={onCreateGroup}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>CREATE GROUP</Text>
        </TouchableOpacity>

        {/* Secondary */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onJoinGroup}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>JOIN GROUP</Text>
        </TouchableOpacity>

        {/* Ghost */}
        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={onSoloRide}
          activeOpacity={0.7}
        >
          <Text style={styles.ghostBtnText}>SOLO RIDE</Text>
        </TouchableOpacity>

        {/* Recent rides */}
        {recentRides.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>RECENT RIDES</Text>
              <View style={styles.dividerLine} />
            </View>
            {recentRides.slice(0, 3).map((ride) => (
              <View key={ride.id} style={styles.rideRow}>
                <Text style={styles.rideDate}>{ride.date}</Text>
                <Text style={styles.rideMeta}>
                  {ride.duration} · {ride.distance}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Status row */}
        <View style={styles.statusRow}>
          <Text style={[styles.statusItem, { color: satColor }]}>
            {satLabel}
          </Text>
          <View style={styles.statusDivider} />
          <Text style={[styles.statusItem, { color: meshColor }]}>
            {meshLabel}
          </Text>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,18,0.6)',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,200,232,0.2)',
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 4,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#0A0E12',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 6,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  ghostBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  ghostBtnText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  recentSection: {
    marginTop: 6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginHorizontal: 10,
  },
  rideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rideDate: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  rideMeta: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  statusItem: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textMuted,
    marginHorizontal: 10,
  },
});
