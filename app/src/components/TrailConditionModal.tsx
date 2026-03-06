import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import {
  reportCondition,
  CONDITION_LABELS,
  CONDITION_ICONS,
  CONDITION_COLORS,
  type ConditionType,
} from '../api/trailConditions';
import { colors } from '../theme/colors';

const CONDITION_TYPES: ConditionType[] = ['groomed', 'powder', 'icy', 'tracked_out', 'wet_snow', 'closed'];

interface TrailConditionModalProps {
  visible: boolean;
  userLat: number | null;
  userLng: number | null;
  onClose: () => void;
  onSubmitted: () => void;
}

export function TrailConditionModal({
  visible,
  userLat,
  userLng,
  onClose,
  onSubmitted,
}: TrailConditionModalProps) {
  const [selected, setSelected] = useState<ConditionType | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!selected) {
      Alert.alert('Select a condition type');
      return;
    }
    if (userLat === null || userLng === null) {
      Alert.alert('Location unavailable', 'Enable location to report trail conditions.');
      return;
    }
    setLoading(true);
    try {
      await reportCondition(userLat, userLng, selected, notes.trim() || undefined);
      setSelected(null);
      setNotes('');
      onSubmitted();
      onClose();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSelected(null);
    setNotes('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Report Trail Condition</Text>
          <Text style={styles.subtitle}>
            {userLat !== null ? '📍 Using your current location' : '⚠️ Location not available'}
          </Text>

          <Text style={styles.sectionLabel}>CONDITION</Text>
          <View style={styles.grid}>
            {CONDITION_TYPES.map((type) => {
              const isActive = selected === type;
              const color = CONDITION_COLORS[type];
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.conditionBtn,
                    isActive && { borderColor: color, backgroundColor: color + '22' },
                  ]}
                  onPress={() => setSelected(type)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.conditionIcon}>{CONDITION_ICONS[type]}</Text>
                  <Text style={[styles.conditionLabel, isActive && { color }]}>
                    {CONDITION_LABELS[type]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>NOTE (optional)</Text>
          <TextInput
            style={styles.noteInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. fresh overnight — perfect on north side"
            placeholderTextColor={colors.textDim}
            maxLength={200}
            multiline
            numberOfLines={2}
            autoCapitalize="sentences"
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, (!selected || loading) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!selected || loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 44,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.textDim,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.4,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 13,
    marginBottom: 20,
  },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  conditionBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: '29%',
    flex: 1,
  },
  conditionIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  conditionLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  noteInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    color: colors.text,
    fontSize: 14,
    padding: 12,
    marginBottom: 24,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.textDim,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.textDim,
    fontSize: 16,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
