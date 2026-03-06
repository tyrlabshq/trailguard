import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import {
  CONDITION_LABELS,
  CONDITION_ICONS,
  CONDITION_COLORS,
  type TrailConditionReport,
} from '../api/trailConditions';
import { colors } from '../theme/colors';

interface Props {
  visible: boolean;
  reports: TrailConditionReport[];
  onClose: () => void;
  onReportCondition: () => void;
}

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms) || ms < 0) return 'just now';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

function formatDistance(meters?: number): string {
  if (meters === undefined) return '';
  if (meters < 1000) return `${Math.round(meters)}m away`;
  return `${(meters / 1000).toFixed(1)}km away`;
}

export function RecentConditionsPanel({ visible, reports, onClose, onReportCondition }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Trail Conditions</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.reportBtn} onPress={onReportCondition}>
        <Text style={styles.reportBtnText}>+ Report Condition Here</Text>
      </TouchableOpacity>

      {reports.length === 0 ? (
        <Text style={styles.empty}>No reports in this area yet. Be the first!</Text>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const color = CONDITION_COLORS[item.condition];
            return (
              <View style={[styles.reportRow, { borderLeftColor: color }]}>
                <Text style={styles.reportIcon}>{CONDITION_ICONS[item.condition]}</Text>
                <View style={styles.reportBody}>
                  <View style={styles.reportTopRow}>
                    <Text style={[styles.reportLabel, { color }]}>
                      {CONDITION_LABELS[item.condition]}
                    </Text>
                    {item.distance_m !== undefined && (
                      <Text style={styles.reportDist}>{formatDistance(item.distance_m)}</Text>
                    )}
                  </View>
                  {item.notes && <Text style={styles.reportNotes}>{item.notes}</Text>}
                  <Text style={styles.reportAge}>{formatRelativeTime(item.reported_at)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

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
    marginBottom: 12,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  close: { color: colors.textDim, fontSize: 18, padding: 4 },
  reportBtn: {
    backgroundColor: colors.accent + '22',
    borderColor: colors.accent,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  reportBtnText: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 20, fontSize: 14 },
  list: { flex: 1 },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  reportIcon: { fontSize: 20, marginTop: 1 },
  reportBody: { flex: 1 },
  reportTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportLabel: { fontSize: 14, fontWeight: '700' },
  reportDist: { color: colors.textDim, fontSize: 11 },
  reportNotes: { color: colors.textDim, fontSize: 13, marginTop: 3 },
  reportAge: { color: colors.textDim, fontSize: 11, marginTop: 4 },
});
