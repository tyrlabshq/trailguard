import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Alert, ActivityIndicator, Share, Clipboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { fetchMembers, leaveGroup, disbandGroup } from '../api/groups';
import type { GroupMember } from '../api/groups';
import { useGroup } from '../context/GroupContext';
import { colors } from '../theme/colors';
import type { GroupStackParamList } from '../navigation/AppNavigator';

type Nav = StackNavigationProp<GroupStackParamList, 'GroupDashboard'>;

export default function GroupDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { group, members, setMembers, clearGroup } = useGroup();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!group) return;
    try {
      const list = await fetchMembers(group.groupId);
      setMembers(list);
    } catch {
      // Non-fatal — show stale data
    } finally {
      setLoading(false);
    }
  }, [group, setMembers]);

  useEffect(() => {
    loadMembers();
    const interval = setInterval(loadMembers, 15000);
    return () => clearInterval(interval);
  }, [loadMembers]);

  function copyCode() {
    if (!group) return;
    Clipboard.setString(group.code);
    Alert.alert('Copied!', `Code ${group.code} copied to clipboard`);
  }

  async function shareCode() {
    if (!group) return;
    await Share.share({ message: `Join my PowderLink group: ${group.code}` });
  }

  async function handleLeave() {
    if (!group) return;
    Alert.alert('Leave Group', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          setActionLoading(true);
          try {
            await leaveGroup(group.groupId);
            clearGroup();
            navigation.replace('GroupHome');
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to leave');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }

  async function handleDisband() {
    if (!group) return;
    Alert.alert('Disband Group', 'This will remove everyone. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disband', style: 'destructive', onPress: async () => {
          setActionLoading(true);
          try {
            await disbandGroup(group.groupId);
            clearGroup();
            navigation.replace('GroupHome');
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to disband');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }

  if (!group) {
    navigation.replace('GroupHome');
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.groupName}>{group.name}</Text>
        <TouchableOpacity style={styles.codeRow} onPress={copyCode}>
          <Text style={styles.code}>{group.code}</Text>
          <Text style={styles.codeCopy}>  tap to copy</Text>
        </TouchableOpacity>
      </View>

      {/* Members */}
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.riderId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <MemberRow member={item} />}
          ListEmptyComponent={<Text style={styles.empty}>No members yet</Text>}
        />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
          <Text style={styles.shareBtnText}>Share Code</Text>
        </TouchableOpacity>

        {group.role === 'leader' ? (
          <TouchableOpacity
            style={[styles.dangerBtn, actionLoading && styles.btnDisabled]}
            onPress={handleDisband}
            disabled={actionLoading}
          >
            {actionLoading
              ? <ActivityIndicator color={colors.danger} />
              : <Text style={styles.dangerBtnText}>Disband Group</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.dangerBtn, actionLoading && styles.btnDisabled]}
            onPress={handleLeave}
            disabled={actionLoading}
          >
            {actionLoading
              ? <ActivityIndicator color={colors.danger} />
              : <Text style={styles.dangerBtnText}>Leave Group</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function MemberRow({ member }: { member: GroupMember }) {
  return (
    <View style={rowStyles.row}>
      <View style={[rowStyles.dot, { backgroundColor: member.online ? colors.success : colors.textDim }]} />
      <Text style={rowStyles.name}>{member.name}</Text>
      <View style={[rowStyles.badge, member.role === 'leader' && rowStyles.badgeLeader]}>
        <Text style={[rowStyles.badgeText, member.role === 'leader' && rowStyles.badgeLeaderText]}>
          {member.role === 'leader' ? 'Leader' : 'Member'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 24, paddingTop: 60, backgroundColor: colors.surface },
  groupName: { color: colors.text, fontSize: 26, fontWeight: '700', marginBottom: 8 },
  codeRow: { flexDirection: 'row', alignItems: 'center' },
  code: { color: colors.accent, fontSize: 22, fontWeight: '700', letterSpacing: 4 },
  codeCopy: { color: colors.textDim, fontSize: 12 },
  list: { padding: 16 },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 32 },
  actions: { padding: 20, gap: 12 },
  shareBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  dangerBtn: {
    borderColor: colors.danger,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerBtnText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  name: { color: colors.text, fontSize: 16, flex: 1 },
  badge: {
    backgroundColor: colors.textDim,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeLeader: { backgroundColor: colors.accent + '33' },
  badgeText: { color: colors.text, fontSize: 12 },
  badgeLeaderText: { color: colors.accent },
});
