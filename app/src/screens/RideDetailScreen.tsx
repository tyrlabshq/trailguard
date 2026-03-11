/**
 * RideDetailScreen — TG-723
 *
 * Full ride detail view accessible from Ride History.
 * Shows:
 *  - Static Mapbox route snapshot (GPS path)
 *  - Stats: distance, duration, top speed, avg speed
 *  - Elevation: gain, loss, max altitude (when GPS altitude available)
 *  - Group members list (fetched from Supabase) or "Solo Ride"
 *  - Quick-launch button for Ride Replay
 *  - Share sheet
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Share,
  Alert,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { formatDuration } from '../api/rides';
import { fetchMembers } from '../api/groups';
import type { Ride, RideStats } from '../api/rides';
import type { GroupMember } from '../api/groups';
import type { ProfileStackParamList } from '../navigation/AppNavigator';

// ─── Navigation types ─────────────────────────────────────────────────────────

type RideDetailRoute = RouteProp<ProfileStackParamList, 'RideSummaryFromHistory'>;
type Nav = StackNavigationProp<ProfileStackParamList, 'RideSummaryFromHistory'>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MemberRow({ member, isFirst }: { member: GroupMember; isFirst: boolean }) {
  const initial = (member.name || 'R').charAt(0).toUpperCase();
  const displayName = member.name || `Rider ${member.riderId.slice(-4)}`;
  const roleColor =
    member.role === 'leader' ? colors.primary :
    member.role === 'sweep' ? colors.warning :
    colors.textDim;

  return (
    <View style={[styles.memberRow, !isFirst && styles.memberRowDivider]}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>{initial}</Text>
      </View>
      <Text style={styles.memberName}>{displayName}</Text>
      <View style={[styles.roleChip, { borderColor: roleColor + '55', backgroundColor: roleColor + '18' }]}>
        <Text style={[styles.roleChipText, { color: roleColor }]}>
          {member.role.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RideDetailScreen() {
  const route = useRoute<RideDetailRoute>();
  const navigation = useNavigation<Nav>();
  const { ride } = route.params;
  const stats: RideStats | null = ride.stats ?? null;

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState(false);

  const isSolo = !ride.groupId || ride.groupName === 'Solo';

  const rideDate = new Date(ride.startedAt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const rideTime = new Date(ride.startedAt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

  // ── Load group members ────────────────────────────────────────────────────

  useEffect(() => {
    if (isSolo || !ride.groupId) return;
    setMembersLoading(true);
    setMembersError(false);
    fetchMembers(ride.groupId)
      .then(setMembers)
      .catch(() => setMembersError(true))
      .finally(() => setMembersLoading(false));
  }, [ride.groupId, isSolo]);

  // ── Route GeoJSON for map ─────────────────────────────────────────────────

  const routePoints = stats?.route ?? [];

  const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> | null =
    routePoints.length >= 2
      ? {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routePoints.map(p => [p.lng, p.lat]),
          },
        }
      : null;

  // Camera center = centroid of route
  const mapCenter: [number, number] | null =
    routePoints.length > 0
      ? [
          routePoints.reduce((s, p) => s + p.lng, 0) / routePoints.length,
          routePoints.reduce((s, p) => s + p.lat, 0) / routePoints.length,
        ]
      : null;

  // ── Share ─────────────────────────────────────────────────────────────────

  async function handleShare() {
    if (!stats) return;
    const text =
      `TrailGuard Ride — ${ride.groupName}\n` +
      `${rideDate}\n\n` +
      `Distance: ${stats.distanceMiles} mi\n` +
      `Duration: ${formatDuration(stats.durationSeconds)}\n` +
      `Top Speed: ${stats.topSpeedMph} mph\n` +
      `Avg Speed: ${stats.avgSpeedMph} mph\n` +
      (stats.elevationGainFt
        ? `Elevation: +${stats.elevationGainFt} ft gain, -${stats.elevationLossFt} ft loss\n`
        : '') +
      `\nTracked with TrailGuard`;
    try {
      await Share.share({ message: text, title: 'TrailGuard Ride' });
    } catch {
      Alert.alert('Share failed', 'Could not share ride.');
    }
  }

  const hasElevation = stats && (stats.elevationGainFt > 0 || stats.elevationLossFt > 0 || stats.maxAltitudeFt > 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Custom header ───────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.headerBtnText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {ride.groupName}
          </Text>
          <Text style={styles.headerSub}>{rideDate}</Text>
        </View>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleShare}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={!stats}
        >
          <Text style={[styles.headerBtnText, !stats && { opacity: 0.3 }]}>⬆</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Route map ───────────────────────────────────────────────────── */}
        <View style={styles.mapWrapper}>
          {mapCenter && routeGeoJSON ? (
            <MapboxGL.MapView
              style={styles.map}
              styleURL="mapbox://styles/mapbox/outdoors-v12"
              zoomEnabled={false}
              scrollEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              logoEnabled={false}
              attributionEnabled={false}
            >
              <MapboxGL.Camera
                centerCoordinate={mapCenter}
                zoomLevel={12}
                animationMode="none"
                animationDuration={0}
              />

              {/* Route polyline */}
              <MapboxGL.ShapeSource id="ride-route" shape={routeGeoJSON}>
                <MapboxGL.LineLayer
                  id="ride-route-line"
                  style={{
                    lineColor: colors.accent,
                    lineWidth: 3.5,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </MapboxGL.ShapeSource>

              {/* Start pin */}
              <MapboxGL.PointAnnotation
                id="start-pin"
                coordinate={[routePoints[0].lng, routePoints[0].lat]}
              >
                <View style={styles.startDot} />
              </MapboxGL.PointAnnotation>

              {/* End pin */}
              <MapboxGL.PointAnnotation
                id="end-pin"
                coordinate={[
                  routePoints[routePoints.length - 1].lng,
                  routePoints[routePoints.length - 1].lat,
                ]}
              >
                <View style={styles.endDot} />
              </MapboxGL.PointAnnotation>
            </MapboxGL.MapView>
          ) : (
            // Placeholder when no route data
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderIcon}>🗺</Text>
              <Text style={styles.mapPlaceholderText}>
                {stats?.pointCount
                  ? `${stats.pointCount} GPS points recorded`
                  : 'No GPS route data'}
              </Text>
            </View>
          )}

          {/* Replay overlay */}
          <TouchableOpacity
            style={styles.replayChip}
            onPress={() => navigation.navigate('RideReplay', { rideId: ride.rideId })}
            activeOpacity={0.85}
          >
            <Text style={styles.replayChipText}>▶  REPLAY</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats grid ──────────────────────────────────────────────────── */}
        {stats ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>RIDE STATS</Text>
            <View style={styles.statsGrid}>
              <StatCard
                label="Distance"
                value={`${stats.distanceMiles}`}
                sub="mi"
              />
              <StatCard
                label="Duration"
                value={formatDuration(stats.durationSeconds)}
              />
              <StatCard
                label="Top Speed"
                value={`${stats.topSpeedMph}`}
                sub="mph"
              />
              <StatCard
                label="Avg Speed"
                value={`${stats.avgSpeedMph}`}
                sub="mph"
              />
            </View>
          </View>
        ) : (
          <View style={styles.noStats}>
            <Text style={styles.noStatsText}>No stats available for this ride.</Text>
          </View>
        )}

        {/* ── Elevation ───────────────────────────────────────────────────── */}
        {hasElevation && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ELEVATION</Text>
            <View style={styles.elevRow}>
              <View style={styles.elevCard}>
                <Text style={[styles.elevValue, styles.elevGain]}>
                  +{stats!.elevationGainFt.toLocaleString()} ft
                </Text>
                <Text style={styles.elevLabel}>Gain</Text>
              </View>
              <View style={styles.elevSep} />
              <View style={styles.elevCard}>
                <Text style={[styles.elevValue, styles.elevLoss]}>
                  -{stats!.elevationLossFt.toLocaleString()} ft
                </Text>
                <Text style={styles.elevLabel}>Loss</Text>
              </View>
              <View style={styles.elevSep} />
              <View style={styles.elevCard}>
                <Text style={styles.elevValue}>
                  {stats!.maxAltitudeFt.toLocaleString()} ft
                </Text>
                <Text style={styles.elevLabel}>Max Alt.</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Members ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {isSolo ? 'RIDER' : 'GROUP MEMBERS'}
          </Text>

          <View style={styles.memberCard}>
            {isSolo ? (
              // Solo ride badge
              <View style={styles.soloRow}>
                <View style={styles.soloIcon}>
                  <Text style={styles.soloIconText}>S</Text>
                </View>
                <Text style={styles.soloLabel}>Solo Ride</Text>
              </View>
            ) : membersLoading ? (
              <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />
            ) : membersError ? (
              <Text style={styles.membersError}>Could not load members</Text>
            ) : members.length > 0 ? (
              members.map((m, i) => (
                <MemberRow key={m.riderId} member={m} isFirst={i === 0} />
              ))
            ) : (
              // No member data — show group name as fallback
              <View style={styles.soloRow}>
                <View style={[styles.soloIcon, { backgroundColor: colors.primary + '22' }]}>
                  <Text style={[styles.soloIconText, { color: colors.primary }]}>G</Text>
                </View>
                <Text style={styles.soloLabel}>{ride.groupName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: { color: colors.accent, fontSize: 26, fontWeight: '300' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    color: colors.text,
    fontSize: typography.md,
    fontWeight: typography.semibold,
  },
  headerSub: { color: colors.textDim, fontSize: typography.xs, marginTop: 1 },

  scroll: { flex: 1 },
  content: { paddingBottom: 24 },

  // Map
  mapWrapper: {
    height: 220,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    overflow: 'hidden',
  },
  map: { flex: 1 },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapPlaceholderIcon: { fontSize: 40 },
  mapPlaceholderText: { color: colors.textDim, fontSize: typography.sm },

  // Replay button overlay
  replayChip: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(8,14,20,0.88)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  replayChipText: {
    color: colors.accent,
    fontSize: typography.xs,
    fontWeight: typography.bold,
    letterSpacing: 0.8,
  },

  // Map pins
  startDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: '#fff',
  },
  endDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: '#fff',
  },

  // Sections
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionLabel: {
    color: colors.textDim,
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    color: colors.accent,
    fontSize: typography.xl,
    fontWeight: typography.bold,
  },
  statSub: { color: colors.textDim, fontSize: typography.xs, marginTop: 1 },
  statLabel: { color: colors.textDim, fontSize: typography.xs, marginTop: 4 },

  noStats: {
    padding: 24,
    alignItems: 'center',
  },
  noStatsText: { color: colors.textDim, fontSize: typography.sm },

  // Elevation
  elevRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  elevCard: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  elevSep: { width: 1, backgroundColor: colors.divider, marginVertical: 12 },
  elevValue: {
    color: colors.text,
    fontSize: typography.md,
    fontWeight: typography.semibold,
  },
  elevGain: { color: colors.success },
  elevLoss: { color: colors.danger },
  elevLabel: { color: colors.textDim, fontSize: typography.xs, marginTop: 4 },

  // Members
  memberCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  memberRowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '28',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: colors.primary,
    fontSize: typography.sm,
    fontWeight: typography.bold,
  },
  memberName: {
    flex: 1,
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  roleChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleChipText: { fontSize: typography.xs, fontWeight: typography.bold, letterSpacing: 0.5 },

  // Solo / fallback
  soloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  soloIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.textDim + '28',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  soloIconText: { color: colors.textDim, fontSize: typography.sm, fontWeight: typography.bold },
  soloLabel: { color: colors.text, fontSize: typography.sm, fontWeight: typography.medium },
  membersError: { color: colors.textDim, fontSize: typography.sm, padding: 16, textAlign: 'center' },
});
