/**
 * GroupCreateScreen — Map flow
 *
 * Triggered from HomeOverlay "CREATE GROUP" button.
 * Creates a group, shows the 6-char invite code, and lets user START RIDING
 * which collapses the HomeOverlay (group is now set in GroupContext).
 *
 * Different from CreateGroupScreen.tsx (Group tab flow, navigates to GroupDashboard).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { createGroup } from '../api/groups';
import { useGroup } from '../context/GroupContext';
import { colors } from '../theme/colors';
import type { MapStackParamList } from '../navigation/AppNavigator';

type Nav = StackNavigationProp<MapStackParamList, 'GroupCreate'>;

export default function GroupCreateScreen() {
  const navigation = useNavigation<Nav>();
  const { setGroup } = useGroup();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  // After creation, show invite code
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Group Name Required', 'Enter a name for your group.');
      return;
    }
    setLoading(true);
    try {
      const res = await createGroup(trimmed);
      // Set in context (HomeOverlay will collapse when MapScreen detects group)
      setGroup({ groupId: res.groupId, code: res.code, name: trimmed, role: 'leader' });
      setGroupId(res.groupId);
      setInviteCode(res.code);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  }

  async function handleShareCode() {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `Join my TrailGuard group! Code: ${inviteCode}`,
        title: 'TrailGuard Group Code',
      });
    } catch {
      // User cancelled share — non-fatal
    }
  }

  function handleStartRiding() {
    // Group is already set in context — just pop back to map
    // HomeOverlay will be hidden, ActiveRideBar will appear
    navigation.popToTop();
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 16 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>CANCEL</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>CREATE GROUP</Text>
        <View style={styles.backBtn} />
      </View>

      {inviteCode ? (
        /* ── Success state ── */
        <View style={styles.successContainer}>
          <Text style={styles.successLabel}>GROUP CREATED</Text>
          <Text style={styles.groupDisplayName}>{name.trim().toUpperCase()}</Text>

          <Text style={styles.codeLabel}>INVITE CODE</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{inviteCode}</Text>
          </View>
          <Text style={styles.codeHint}>
            Share this code with your riders. They can join from the map home screen.
          </Text>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShareCode}>
            <Text style={styles.shareBtnText}>SHARE CODE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.startBtn} onPress={handleStartRiding}>
            <Text style={styles.startBtnText}>START RIDING</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Input state ── */
        <View style={styles.inputContainer}>
          <Text style={styles.label}>GROUP NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="Sunday Trail Crew"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={32}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <Text style={styles.hint}>
            A 6-character invite code will be generated for others to join.
          </Text>

          <TouchableOpacity
            style={[styles.createBtn, (!name.trim() || loading) && styles.btnDisabled]}
            onPress={handleCreate}
            disabled={!name.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="#0A0E12" />
              : <Text style={styles.createBtnText}>CREATE</Text>}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 36,
  },
  backBtn: {
    minWidth: 60,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  screenTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // Input state
  inputContainer: {
    flex: 1,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 6,
    height: 54,
    paddingHorizontal: 16,
    fontSize: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 28,
  },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  createBtnText: {
    color: '#0A0E12',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Success state
  successContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  successLabel: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  groupDisplayName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 40,
  },
  codeLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  codeBox: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,200,232,0.3)',
    paddingVertical: 20,
    paddingHorizontal: 40,
    marginBottom: 14,
  },
  codeText: {
    color: colors.primary,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 10,
  },
  codeHint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  shareBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 6,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12,
  },
  shareBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  startBtn: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  startBtnText: {
    color: '#0A0E12',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
