import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import type { TrailSegment, TrailDifficulty } from '../services/TrailSnapping';
import { segmentLengthM } from '../services/TrailSnapping';

// ─── Difficulty config ──────────────────────────────────────────────────────

export const DIFFICULTY_LABELS: Record<TrailDifficulty, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
  expert: 'Expert',
  unknown: 'Unknown',
};

export const DIFFICULTY_BADGE_COLORS: Record<TrailDifficulty, string> = {
  easy: '#00dd66',
  moderate: '#E8C800',
  hard: '#FF8C00',
  expert: '#FF3B3B',
  unknown: '#6699cc',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDistance(metres: number): string {
  if (metres < 1_000) return `${Math.round(metres)} m`;
  const km = metres / 1_000;
  return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
}

function estimateElevationGain(coords: [number, number][]): number | null {
  // OSM Overpass data doesn't include elevation; coordinates are [lng, lat].
  // Return null when altitude data is unavailable.
  return null;
}

function formatElevation(metres: number): string {
  return `${Math.round(metres)} m`;
}

// ─── Trail Card ─────────────────────────────────────────────────────────────

function TrailCard({ trail }: { trail: TrailSegment }) {
  const distance = segmentLengthM(trail.coordinates);
  const elevation = estimateElevationGain(trail.coordinates);
  const badgeColor = DIFFICULTY_BADGE_COLORS[trail.difficulty];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.trailName} numberOfLines={1}>
          {trail.name || 'Unnamed Trail'}
        </Text>
        <View style={[styles.difficultyBadge, { backgroundColor: badgeColor + '22', borderColor: badgeColor }]}>
          <Text style={[styles.difficultyText, { color: badgeColor }]}>
            {DIFFICULTY_LABELS[trail.difficulty]}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        {/* Distance */}
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>↔</Text>
          <Text style={styles.statValue}>{formatDistance(distance)}</Text>
        </View>

        {/* Elevation gain — shown only when data is available */}
        {elevation !== null && (
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>▲</Text>
            <Text style={styles.statValue}>{formatElevation(elevation)}</Text>
          </View>
        )}

        {/* Trail type */}
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>◆</Text>
          <Text style={styles.statValue}>{trail.trailType}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Panel ──────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  trails: TrailSegment[];
  onClose: () => void;
}

export function NearbyTrailsPanel({ visible, trails, onClose }: Props) {
  if (!visible) return null;

  // Deduplicate trails by name (OSM can have many segments for the same trail)
  const seen = new Map<string, TrailSegment>();
  for (const t of trails) {
    const key = t.name || t.id;
    const existing = seen.get(key);
    if (!existing || segmentLengthM(t.coordinates) > segmentLengthM(existing.coordinates)) {
      seen.set(key, t);
    }
  }
  const dedupedTrails = Array.from(seen.values());

  // Sort: known difficulty first, then by distance descending
  dedupedTrails.sort((a, b) => {
    if (a.difficulty === 'unknown' && b.difficulty !== 'unknown') return 1;
    if (a.difficulty !== 'unknown' && b.difficulty === 'unknown') return -1;
    return segmentLengthM(b.coordinates) - segmentLengthM(a.coordinates);
  });

  // Summary counts
  const counts: Record<string, number> = {};
  for (const t of dedupedTrails) {
    counts[t.difficulty] = (counts[t.difficulty] ?? 0) + 1;
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Trails</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      {dedupedTrails.length > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {dedupedTrails.length} trail{dedupedTrails.length !== 1 ? 's' : ''}
            {counts.easy ? ` · ${counts.easy} easy` : ''}
            {counts.moderate ? ` · ${counts.moderate} mod` : ''}
            {counts.hard ? ` · ${counts.hard} hard` : ''}
            {counts.expert ? ` · ${counts.expert} expert` : ''}
          </Text>
        </View>
      )}

      {dedupedTrails.length === 0 ? (
        <Text style={styles.empty}>No trails loaded yet. Enable Snap to Trail to load nearby trails.</Text>
      ) : (
        <FlatList
          data={dedupedTrails}
          keyExtractor={(t) => t.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <TrailCard trail={item} />}
        />
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '55%',
    backgroundColor: 'rgba(13,21,32,0.97)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { color: colors.text, fontSize: typography.lg, fontWeight: typography.bold },
  close: { color: colors.textDim, fontSize: 18, padding: 4 },
  summaryRow: { marginBottom: 10 },
  summaryText: { color: colors.textDim, fontSize: typography.xs },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 20, fontSize: typography.sm },
  list: { flex: 1 },

  // Trail card
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trailName: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    flex: 1,
    marginRight: 8,
  },

  // Difficulty pill badge
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: typography.bold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: typography.bold,
  },
  statValue: {
    color: colors.textSecondary,
    fontSize: typography.xs,
    fontWeight: typography.medium,
  },
});
