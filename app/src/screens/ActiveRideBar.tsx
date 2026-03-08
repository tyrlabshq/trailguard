import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

interface ActiveRideBarProps {
  groupName: string;
  memberCount: number;
  onEndRide: () => void;
  onSOS: () => void;
}

export default function ActiveRideBar({
  groupName,
  memberCount,
  onEndRide,
  onSOS,
}: ActiveRideBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);

  return (
    <View style={[styles.bar, { paddingBottom: bottomPad }]}>
      {/* Group info */}
      <View style={styles.info}>
        <Text style={styles.groupName} numberOfLines={1}>
          {groupName.toUpperCase()}
        </Text>
        <Text style={styles.memberCount}>
          {memberCount} {memberCount === 1 ? 'MEMBER' : 'MEMBERS'}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.endBtn}
          onPress={onEndRide}
          activeOpacity={0.8}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.endBtnText}>END RIDE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sosBtn}
          onPress={onSOS}
          activeOpacity={0.8}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.sosBtnText}>SOS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,200,232,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    minHeight: 80,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  groupName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  memberCount: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  endBtn: {
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
    borderRadius: 6,
    height: 44,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtnText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sosBtn: {
    backgroundColor: colors.danger,
    borderRadius: 6,
    height: 44,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
