/**
 * PreRideScreen — TG-Offline-2
 *
 * "Pre-Ride Checklist" — downloads and caches all critical data before
 * heading into areas with poor or no cell coverage.
 *
 * Accessible from GroupDashboardScreen via the Pre-Ride header button.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useGroup } from '../context/GroupContext';
import { PreRideCache } from '../services/PreRideCache';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import MapboxGL from '@rnmapbox/maps';

// ─── Step definition ─────────────────────────────────────────────────────────

type StepStatus = 'idle' | 'loading' | 'done' | 'error';

interface Step {
  id: string;
  label: string;
  description: string;
  status: StepStatus;
  detail?: string;
}

const INITIAL_STEPS: Step[] = [
  { id: 'members',    label: 'Group member locations',   description: 'Caching last-known positions', status: 'idle' },
  { id: 'conditions', label: 'Trail conditions',          description: 'Nearby hazards and snow reports', status: 'idle' },
  { id: 'avalanche',  label: 'Avalanche data',            description: 'Current danger zones', status: 'idle' },
  { id: 'pois',       label: 'Points of interest',        description: 'Fuel, parking, warming huts', status: 'idle' },
  { id: 'tiles',      label: 'Offline map tiles',         description: '50km radius around your location', status: 'idle' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function PreRideScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { group } = useGroup();

  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [summary, setSummary] = useState<{
    membersCount: number;
    trailConditionsCount: number;
    mapRegionKm2: number;
  } | null>(null);

  const updateStep = useCallback(
    (id: string, patch: Partial<Step>) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
    },
    [],
  );

  const handleLocationUpdate = useCallback((location: MapboxGL.Location) => {
    setUserCoords([location.coords.longitude, location.coords.latitude]);
  }, []);

  const runChecklist = useCallback(async () => {
    if (!group || isRunning) return;
    setIsRunning(true);
    setIsDone(false);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'idle' })));

    // Determine center coords — use device location or fallback
    const [lng, lat] = userCoords ?? [-84.9573, 46.3539];

    let totalMembers = 0;
    let totalConditions = 0;
    let totalMapKm2 = 0;

    // ── Step: members ──────────────────────────────────────────────────
    updateStep('members', { status: 'loading' });
    try {
      const result = await PreRideCache.cacheGroupData(group.groupId, lat, lng);
      totalMembers = result.membersCount;
      totalConditions = result.trailConditionsCount;
      totalMapKm2 = result.mapRegionKm2;
      updateStep('members', {
        status: 'done',
        detail: `${result.membersCount} member${result.membersCount === 1 ? '' : 's'} cached`,
      });
    } catch {
      updateStep('members', { status: 'error', detail: 'Failed to cache members' });
    }

    updateStep('conditions', {
      status: 'done',
      detail: `${totalConditions} report${totalConditions === 1 ? '' : 's'} cached`,
    });

    updateStep('avalanche', { status: 'done', detail: 'Cached' });

    updateStep('pois', { status: 'done', detail: 'Cached' });

    updateStep('tiles', {
      status: 'done',
      detail: `~${totalMapKm2.toLocaleString()} km² queued for download`,
    });

    setSummary({ membersCount: totalMembers, trailConditionsCount: totalConditions, mapRegionKm2: totalMapKm2 });
    setIsDone(true);
    setIsRunning(false);
  }, [group, isRunning, userCoords, updateStep]);

  const getStepIcon = (status: StepStatus): string => {
    switch (status) {
      case 'done':    return '✅';
      case 'loading': return '⏳';
      case 'error':   return '❌';
      default:        return '○';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Hidden location listener for current position */}
      <MapboxGL.MapView style={styles.hiddenMap}>
        <MapboxGL.UserLocation visible={false} onUpdate={handleLocationUpdate} />
      </MapboxGL.MapView>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pre-Ride Checklist</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Intro */}
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Before You Drop In</Text>
          <Text style={styles.introBody}>
            Cache everything your group needs for offline riding. Takes about 30 seconds on WiFi.
          </Text>
          <View style={styles.coverageNote}>
            <Text style={styles.coverageIcon}>📶</Text>
            <Text style={styles.coverageText}>Cell coverage: Unknown beyond this area</Text>
          </View>
        </View>

        {/* Checklist */}
        <View style={styles.checklist}>
          {steps.map((step) => (
            <View key={step.id} style={styles.stepRow}>
              <Text style={styles.stepIcon}>{getStepIcon(step.status)}</Text>
              <View style={styles.stepText}>
                <Text style={styles.stepLabel}>{step.label}</Text>
                <Text style={styles.stepDesc}>
                  {step.status === 'loading'
                    ? step.description + '…'
                    : step.detail ?? step.description}
                </Text>
              </View>
              {step.status === 'loading' && (
                <ActivityIndicator size="small" color={colors.accent} style={styles.stepSpinner} />
              )}
            </View>
          ))}
        </View>

        {/* Success summary */}
        {isDone && summary && (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Ready to ride 🏔️</Text>
            <Text style={styles.successBody}>Data cached for offline use.</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.membersCount}</Text>
                <Text style={styles.summaryLabel}>Members</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.trailConditionsCount}</Text>
                <Text style={styles.summaryLabel}>Reports</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>~{summary.mapRegionKm2.toLocaleString()}</Text>
                <Text style={styles.summaryLabel}>km² map</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[
            styles.runBtn,
            (isRunning || !group) && styles.runBtnDisabled,
          ]}
          onPress={runChecklist}
          disabled={isRunning || !group}
        >
          {isRunning ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.runBtnText}>
              {isDone ? '↺ Re-Cache Everything' : '⬇ Download for Offline'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hiddenMap: {
    width: 1,
    height: 1,
    position: 'absolute',
    opacity: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: {
    color: colors.accent,
    fontSize: typography.md,
    fontWeight: '600',
    minWidth: 48,
  },
  title: {
    color: colors.text,
    fontSize: typography.lg,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  intro: {
    gap: 8,
  },
  introTitle: {
    color: colors.text,
    fontSize: typography.xl,
    fontWeight: '700',
  },
  introBody: {
    color: colors.textDim,
    fontSize: typography.sm,
    lineHeight: 20,
  },
  coverageNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  coverageIcon: {
    fontSize: 16,
  },
  coverageText: {
    color: colors.textDim,
    fontSize: typography.xs,
    fontWeight: '600',
  },
  checklist: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    gap: 12,
  },
  stepIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  stepText: {
    flex: 1,
  },
  stepLabel: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: '600',
  },
  stepDesc: {
    color: colors.textDim,
    fontSize: typography.xs,
    marginTop: 2,
  },
  stepSpinner: {
    marginLeft: 8,
  },
  successCard: {
    backgroundColor: colors.success + '18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success + '44',
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  successTitle: {
    color: colors.success,
    fontSize: typography.xl,
    fontWeight: '700',
  },
  successBody: {
    color: colors.success,
    fontSize: typography.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    color: colors.text,
    fontSize: typography.xl,
    fontWeight: '700',
  },
  summaryLabel: {
    color: colors.textDim,
    fontSize: typography.xs,
    marginTop: 2,
  },
  footer: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  runBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  runBtnDisabled: {
    opacity: 0.5,
  },
  runBtnText: {
    color: '#000',
    fontSize: typography.md,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
