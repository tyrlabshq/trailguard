/**
 * TrailGuard — First-Run Onboarding Flow
 *
 * Steps:
 *   0  Welcome         — branding + 3 value props
 *   1  Location perms  — explain GPS, request permission
 *   2  Notification    — explain alerts, request permission
 *   3  Auth            — Sign in with Apple OR Continue as Guest
 *   4  Feature tour    — swipeable 3-card intro
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import appleAuth, {
  AppleRequestScope,
  AppleRequestOperation,
  AppleError,
} from '@invertase/react-native-apple-authentication';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const { width: SCREEN_W } = Dimensions.get('window');

export const ONBOARDING_KEY = 'hasSeenOnboarding';

// ─── Prop types ───────────────────────────────────────────────────────────────
interface Props {
  onComplete: () => void;
}

// ─── Feature tour data ────────────────────────────────────────────────────────
const TOUR_SLIDES = [
  {
    icon: '🗺️',
    title: 'Trail Maps — Offline',
    body: 'Download maps before you ride. Full trail coverage works even when you have zero signal deep in the backcountry.',
  },
  {
    icon: '📍',
    title: 'Community Reports',
    body: 'See real-time hazard reports, trail conditions, and closures posted by riders in your area.',
  },
  {
    icon: '👥',
    title: 'Live Group Tracking',
    body: 'Know where your crew is at all times. Share your live location and keep everyone together — no cell signal needed.',
  },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const next = () => setStep((s) => s + 1);

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  };

  switch (step) {
    case 0:
      return <WelcomeStep onNext={next} />;
    case 1:
      return <LocationStep onNext={next} />;
    case 2:
      return <NotificationStep onNext={next} />;
    case 3:
      return (
        <AuthStep
          loading={loading}
          setLoading={setLoading}
          onNext={next}
        />
      );
    case 4:
      return <FeatureTourStep onFinish={finish} />;
    default:
      return null;
  }
}

// ─── Shared layout ────────────────────────────────────────────────────────────
function StepContainer({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <View style={s.inner}>{children}</View>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  loading,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity style={s.primaryBtn} onPress={onPress} disabled={loading} activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color={colors.textInverse} />
      ) : (
        <Text style={s.primaryBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.secondaryBtn} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.secondaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Step 0: Welcome ──────────────────────────────────────────────────────────
function WelcomeStep({ onNext }: { onNext: () => void }) {
  const valueProps = [
    { icon: '📡', label: 'Offline Trail Maps', sub: 'Full coverage, zero signal required' },
    { icon: '👥', label: 'Live Group Tracking', sub: 'Always know where your crew is' },
    { icon: '🆘', label: 'Emergency SOS', sub: 'One tap — alerts your group instantly' },
  ];

  return (
    <StepContainer>
      <Text style={s.logoEmoji}>🏔️</Text>
      <Text style={s.heroTitle}>TrailGuard</Text>
      <Text style={s.heroSub}>Ride together. Stay safe.</Text>

      <View style={s.valuePropList}>
        {valueProps.map((vp) => (
          <View key={vp.label} style={s.valuePropRow}>
            <Text style={s.valuePropIcon}>{vp.icon}</Text>
            <View>
              <Text style={s.valuePropLabel}>{vp.label}</Text>
              <Text style={s.valuePropSub}>{vp.sub}</Text>
            </View>
          </View>
        ))}
      </View>

      <PrimaryButton label="Get Started →" onPress={onNext} />
    </StepContainer>
  );
}

// ─── Step 1: Location Permission ─────────────────────────────────────────────
function LocationStep({ onNext }: { onNext: () => void }) {
  const [requesting, setRequesting] = useState(false);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      const perm =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

      const status = await check(perm);
      if (status !== RESULTS.GRANTED) {
        await request(perm);
      }
    } catch (e) {
      console.warn('[Onboarding] location perm error', e);
    } finally {
      setRequesting(false);
      onNext();
    }
  };

  return (
    <StepContainer>
      <Text style={s.stepIcon}>📍</Text>
      <Text style={s.stepTitle}>Location Access</Text>
      <Text style={s.stepBody}>
        TrailGuard uses your GPS to:
      </Text>

      <View style={s.reasonList}>
        {[
          'Show your position on the trail map',
          'Surface nearby trails and hazards',
          'Share your live location with your group',
          'Pinpoint your coordinates in an SOS',
        ].map((r) => (
          <View key={r} style={s.reasonRow}>
            <Text style={s.bullet}>›</Text>
            <Text style={s.reasonText}>{r}</Text>
          </View>
        ))}
      </View>

      <Text style={s.privacyNote}>
        Your location is only shared with your active group — never stored or sold.
      </Text>

      <PrimaryButton label="Allow Location" onPress={handleRequest} loading={requesting} />
      <SecondaryButton label="Not now" onPress={onNext} />
    </StepContainer>
  );
}

// ─── Step 2: Notification Permission ────────────────────────────────────────
function NotificationStep({ onNext }: { onNext: () => void }) {
  const [requesting, setRequesting] = useState(false);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      const settings = await notifee.requestPermission();
      if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
        // User declined — that's fine, continue
        console.log('[Onboarding] notifications declined');
      }
    } catch (e) {
      console.warn('[Onboarding] notification perm error', e);
    } finally {
      setRequesting(false);
      onNext();
    }
  };

  return (
    <StepContainer>
      <Text style={s.stepIcon}>🔔</Text>
      <Text style={s.stepTitle}>Stay in the Loop</Text>
      <Text style={s.stepBody}>
        Notifications keep you and your group safe:
      </Text>

      <View style={s.reasonList}>
        {[
          'SOS alerts — immediate if a rider needs help',
          'Group updates — join requests, check-ins',
          'Trail hazard reports from nearby riders',
          'Ride start / end reminders from your group',
        ].map((r) => (
          <View key={r} style={s.reasonRow}>
            <Text style={s.bullet}>›</Text>
            <Text style={s.reasonText}>{r}</Text>
          </View>
        ))}
      </View>

      <Text style={s.privacyNote}>
        SOS alerts are time-critical. Turning these off could delay emergency response.
      </Text>

      <PrimaryButton label="Allow Notifications" onPress={handleRequest} loading={requesting} />
      <SecondaryButton label="Not now" onPress={onNext} />
    </StepContainer>
  );
}

// ─── Step 3: Auth ─────────────────────────────────────────────────────────────
interface AuthStepProps {
  loading: boolean;
  setLoading: (v: boolean) => void;
  onNext: () => void;
}

function AuthStep({ loading, setLoading, onNext }: AuthStepProps) {
  const [authError, setAuthError] = useState<string | null>(null);
  const [showGuestCta, setShowGuestCta] = useState(true);

  const continueAsGuest = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      if (!data.user) throw new Error('No user returned');
      onNext();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not sign in. Check your connection.';
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with Apple — real implementation via @invertase/react-native-apple-authentication
   *
   * Flow:
   *   1. Request identity token + user info from Apple
   *   2. Pass identityToken to Supabase signInWithIdToken
   *   3. On cancel/error: set a user-visible error message, keep guest CTA hidden
   *      so the user intentionally taps it (not auto-fallback on failure)
   */
  const signInWithApple = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      const appleAuthResponse = await appleAuth.performRequest({
        requestedOperation: AppleRequestOperation.LOGIN,
        requestedScopes: [AppleRequestScope.EMAIL, AppleRequestScope.FULL_NAME],
      });

      const { identityToken, user, email, fullName } = appleAuthResponse;

      if (!identityToken) {
        // Apple returned a response but without a token — treat as a soft error
        throw new Error('Apple did not return an identity token. Please try again.');
      }

      // Sign in to Supabase with the Apple identity token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Supabase did not return a user after Apple sign-in.');

      // Optionally update the user's display name if Apple provided it on first sign-in
      if (fullName?.givenName || fullName?.familyName) {
        const displayName = [fullName.givenName, fullName.familyName].filter(Boolean).join(' ');
        await supabase.auth.updateUser({ data: { full_name: displayName, apple_user_id: user } }).catch(() => {
          // Non-fatal — profile update can fail without blocking onboarding
          console.warn('[Auth] Could not update display name after Apple sign-in');
        });
      }

      console.log('[Auth] Apple sign-in success, user:', data.user.id);
      onNext();
    } catch (err: unknown) {
      // AppleAuthError.CANCELED = 1001 — user dismissed the sheet, not an error
      if ((err as { code?: string })?.code === AppleError.CANCELED) {
        console.log('[Auth] Apple sign-in cancelled by user');
        // Don't show an error message for user-initiated cancel
        setLoading(false);
        return;
      }

      const msg =
        err instanceof Error ? err.message : 'Apple sign-in failed. Please try again or continue as Guest.';
      console.warn('[Auth] Apple sign-in error:', err);
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Apple sign-in is available on iOS 13+
  const appleSignInAvailable = Platform.OS === 'ios' && appleAuth.isSupported;

  return (
    <StepContainer>
      <Text style={s.stepIcon}>🔐</Text>
      <Text style={s.stepTitle}>Create Your Account</Text>
      <Text style={s.stepBody}>
        Save your ride history, groups, and offline maps across devices. Or start riding now and upgrade later.
      </Text>

      {authError ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{authError}</Text>
        </View>
      ) : null}

      {appleSignInAvailable && (
        <TouchableOpacity
          style={[s.appleBtn, loading && s.btnDisabled]}
          onPress={signInWithApple}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <>
              <Text style={s.appleBtnIcon}></Text>
              <Text style={s.appleBtnText}>Sign in with Apple</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {showGuestCta && (
        <PrimaryButton
          label={loading ? '' : 'Continue as Guest'}
          onPress={continueAsGuest}
          loading={loading}
        />
      )}

      <Text style={s.privacyNote}>
        No email required. Guest accounts are anonymous and can be linked to Apple ID later.
      </Text>
    </StepContainer>
  );
}

// ─── Step 4: Feature Tour ─────────────────────────────────────────────────────
function FeatureTourStep({ onFinish }: { onFinish: () => void }) {
  const flatRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLast = activeIndex === TOUR_SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      onFinish();
    } else {
      const next = activeIndex + 1;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <FlatList
        ref={flatRef}
        data={TOUR_SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
          setActiveIndex(idx);
        }}
        renderItem={({ item }) => (
          <View style={s.tourSlide}>
            <Text style={s.tourIcon}>{item.icon}</Text>
            <Text style={s.tourTitle}>{item.title}</Text>
            <Text style={s.tourBody}>{item.body}</Text>
          </View>
        )}
      />

      {/* Dot indicators */}
      <View style={s.dotsRow}>
        {TOUR_SLIDES.map((_, i) => (
          <View
            key={i}
            style={[s.dot, i === activeIndex ? s.dotActive : s.dotInactive]}
          />
        ))}
      </View>

      <View style={s.tourFooter}>
        <PrimaryButton
          label={isLast ? 'Start Riding 🏁' : 'Next →'}
          onPress={handleNext}
        />
        {!isLast && (
          <SecondaryButton label="Skip" onPress={onFinish} />
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'center',
  },

  // Welcome
  logoEmoji: { fontSize: 72, textAlign: 'center', marginBottom: 12 },
  heroTitle: {
    fontSize: typography.hero,
    fontWeight: typography.heavy,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  heroSub: {
    fontSize: typography.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 40,
  },
  valuePropList: { gap: 20, marginBottom: 40 },
  valuePropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  valuePropIcon: { fontSize: 28 },
  valuePropLabel: {
    fontSize: typography.md,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  valuePropSub: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Steps
  stepIcon: { fontSize: 56, textAlign: 'center', marginBottom: 20 },
  stepTitle: {
    fontSize: typography.xxl,
    fontWeight: typography.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepBody: {
    fontSize: typography.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  reasonList: { gap: 12, marginBottom: 24 },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { fontSize: typography.lg, color: colors.primary, lineHeight: 22 },
  reasonText: { flex: 1, fontSize: typography.sm, color: colors.text, lineHeight: 20 },
  privacyNote: {
    fontSize: typography.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: typography.md,
    fontWeight: typography.bold,
    color: colors.textInverse,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },

  // Apple button
  appleBtn: {
    backgroundColor: colors.text,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    minHeight: 52,
  },
  appleBtnIcon: { fontSize: 20, color: colors.textInverse },
  appleBtnText: {
    fontSize: typography.md,
    fontWeight: typography.semibold,
    color: colors.textInverse,
  },
  btnDisabled: { opacity: 0.6 },

  // Error display
  errorBox: {
    backgroundColor: '#2d1a1a',
    borderWidth: 1,
    borderColor: '#c0392b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: typography.sm,
    color: '#e74c3c',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Feature tour
  tourSlide: {
    width: SCREEN_W,
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 100,
    alignItems: 'center',
  },
  tourIcon: { fontSize: 80, marginBottom: 32 },
  tourTitle: {
    fontSize: typography.xxl,
    fontWeight: typography.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  tourBody: {
    fontSize: typography.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  dotInactive: { backgroundColor: colors.textMuted },
  tourFooter: {
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
});
