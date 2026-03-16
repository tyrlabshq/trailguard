/**
 * GroupJoinScreen — Map flow
 *
 * Triggered from HomeOverlay "JOIN GROUP" button.
 * Accepts a 6-char invite code, joins the group, shows group info,
 * and lets user START RIDING which collapses the HomeOverlay.
 *
 * Different from JoinGroupScreen.tsx (Group tab flow, navigates to GroupDashboard).
 */
import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { joinGroup } from '../api/groups';
import { useGroup } from '../context/GroupContext';
import { colors } from '../theme/colors';
import type { MapStackParamList } from '../navigation/AppNavigator';
import { useSubscription } from '../context/SubscriptionContext';
import { SUBSCRIPTION_CONFIG } from '../services/SubscriptionService';

type Nav = StackNavigationProp<MapStackParamList, 'GroupJoin'>;

export default function GroupJoinScreen() {
  const navigation = useNavigation<Nav>();
  const { setGroup } = useGroup();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const { isPro, triggerPaywall } = useSubscription();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  // After join success
  const [joinedGroupName, setJoinedGroupName] = useState<string | null>(null);
  const [joinedMemberCount, setJoinedMemberCount] = useState<number>(0);

  function handleCodeChange(raw: string) {
    setCode(raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
  }

  async function handleJoin() {
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      Alert.alert('Invalid Code', 'Enter the full 6-character group code.');
      return;
    }
    setLoading(true);
    try {
      const res = await joinGroup(trimmed);

      // Pro gate: free tier allows groups up to SUBSCRIPTION_CONFIG.freeGroupSizeLimit members.
      // The joining rider is the +1, so check if current member count meets the free limit.
      const wouldExceedFreeLimit = res.members.length >= SUBSCRIPTION_CONFIG.freeGroupSizeLimit;
      if (wouldExceedFreeLimit && !isPro) {
        triggerPaywall(
          `This group has ${res.members.length} riders. Upgrade to Pro for unlimited group size.`
        );
        setLoading(false);
        return;
      }

      // Set in context — HomeOverlay will collapse when MapScreen detects group
      setGroup({ groupId: res.groupId, code: trimmed, name: res.name, role: 'member' });
      setJoinedGroupName(res.name);
      setJoinedMemberCount(res.members.length);
    } catch (e: unknown) {
      Alert.alert('Failed to Join', e instanceof Error ? e.message : 'Check the code and try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleStartRiding() {
    // Group already set in context — pop back to map
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
        <Text style={styles.screenTitle}>JOIN GROUP</Text>
        <View style={styles.backBtn} />
      </View>

      {joinedGroupName ? (
        /* ── Success state ── */
        <View style={styles.successContainer}>
          <Text style={styles.successLabel}>JOINED</Text>
          <Text style={styles.groupDisplayName}>{joinedGroupName.toUpperCase()}</Text>
          <Text style={styles.memberInfo}>
            {joinedMemberCount} {joinedMemberCount === 1 ? 'MEMBER' : 'MEMBERS'} IN GROUP
          </Text>

          <TouchableOpacity style={styles.startBtn} onPress={handleStartRiding}>
            <Text style={styles.startBtnText}>START RIDING</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Input state ── */
        <View style={styles.inputContainer}>
          <Text style={styles.label}>INVITE CODE</Text>
          <TextInput
            ref={inputRef}
            style={styles.codeInput}
            placeholder="A1B2C3"
            placeholderTextColor={colors.textMuted}
            value={code}
            onChangeText={handleCodeChange}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="default"
            autoFocus
            returnKeyType="join"
            onSubmitEditing={handleJoin}
          />
          <Text style={styles.hint}>
            Ask your group leader for the 6-character code.
          </Text>

          <TouchableOpacity
            style={[styles.joinBtn, (code.length !== 6 || loading) && styles.btnDisabled]}
            onPress={handleJoin}
            disabled={code.length !== 6 || loading}
          >
            {loading
              ? <ActivityIndicator color="#0A0E12" />
              : <Text style={styles.joinBtnText}>JOIN</Text>}
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
  codeInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 6,
    height: 72,
    paddingHorizontal: 16,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 10,
    textAlign: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 28,
    textAlign: 'center',
  },
  joinBtn: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  joinBtnText: {
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
    paddingTop: 30,
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
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  memberInfo: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 48,
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
