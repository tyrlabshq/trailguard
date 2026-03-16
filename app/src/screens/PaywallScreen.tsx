/**
 * PaywallScreen — TrailGuard Pro Paywall
 *
 * Full-screen paywall modal. Shown when free-tier users hit a Pro gate.
 * Present via: useSubscription().triggerPaywall('context message')
 *
 * Pro features gated:
 *   - Unlimited group size (>3 members)
 *   - Satellite bridge
 *   - Advanced ride analytics
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';
import { useSubscription } from '../context/SubscriptionContext';
import SubscriptionService from '../services/SubscriptionService';
import { colors } from '../theme/colors';

// ─── Pro Features List ────────────────────────────────────────────────────────

const PRO_FEATURES = [
  { icon: '👥', title: 'Unlimited Group Size', desc: 'Add more than 3 riders to a group' },
  { icon: '🛰️', title: 'Satellite Bridge', desc: 'SOS & location via satellite when off-grid' },
  { icon: '📊', title: 'Advanced Ride Analytics', desc: 'Charts, heatmaps, and export' },
  { icon: '📍', title: 'Ride Replay', desc: 'Replay your full route with speed overlay' },
  { icon: '⚡', title: 'Priority Safety Alerts', desc: 'Faster crash detection processing' },
  { icon: '🗺️', title: 'Offline Maps Expansion', desc: 'Up to 10GB trail map storage' },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { showPaywall, paywallContext, dismissPaywall, purchase, restore, isLoading, errorMessage, clearError } =
    useSubscription();

  const [offerings, setOfferings] = useState<Awaited<ReturnType<typeof SubscriptionService.getOfferings>>>(null);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Load offerings when paywall appears
  useEffect(() => {
    if (!showPaywall) return;
    clearError();

    SubscriptionService.getOfferings().then((result) => {
      setOfferings(result);
      // Pre-select annual (best value)
      const annual = result?.current?.annual ?? result?.current?.monthly ?? null;
      if (annual) setSelectedPackage(annual);
    });
  }, [showPaywall, clearError]);

  if (!showPaywall) return null;

  const monthlyPackage = offerings?.current?.monthly ?? null;
  const annualPackage = offerings?.current?.annual ?? null;

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    await purchase(selectedPackage);
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    const restored = await restore();
    setIsRestoring(false);
    Alert.alert(
      'Restore Purchases',
      restored
        ? 'Your Pro subscription has been restored! ✅'
        : 'No previous purchases found.',
      [{ text: 'OK' }]
    );
  };

  const ctaLabel = (): string => {
    if (!selectedPackage) return 'Select a Plan';
    switch (selectedPackage.packageType) {
      case 'ANNUAL': return 'Start Free Trial';
      case 'MONTHLY': return 'Start Free Trial';
      default: return 'Continue';
    }
  };

  return (
    <Modal
      visible={showPaywall}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={dismissPaywall}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
        {/* Dismiss button */}
        <TouchableOpacity style={styles.dismissBtn} onPress={dismissPaywall} hitSlop={16}>
          <Text style={styles.dismissIcon}>✕</Text>
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.iconEmoji}>🏔️</Text>
            <Text style={styles.headline}>TrailGuard Pro</Text>
            <Text style={styles.subheadline}>
              Every ride. Every rider. Protected.
            </Text>
          </View>

          {/* Context banner */}
          {paywallContext ? (
            <View style={styles.contextBanner}>
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={styles.contextText}>{paywallContext}</Text>
            </View>
          ) : null}

          {/* Pro features */}
          <View style={styles.featuresCard}>
            {PRO_FEATURES.map((feature) => (
              <View key={feature.title} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <View style={styles.featureTextBlock}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.desc}</Text>
                </View>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            ))}
          </View>

          {/* Pricing */}
          <Text style={styles.pricingLabel}>Choose Your Plan</Text>

          {!offerings ? (
            <View style={styles.loadingPricing}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.loadingText}>Loading pricing...</Text>
            </View>
          ) : (
            <View style={styles.pricingCards}>
              {/* Monthly */}
              {monthlyPackage ? (
                <PricingCard
                  pkg={monthlyPackage}
                  badge={null}
                  savings={null}
                  selected={
                    selectedPackage?.product.identifier ===
                    monthlyPackage.product.identifier
                  }
                  onSelect={() => setSelectedPackage(monthlyPackage)}
                />
              ) : null}

              {/* Annual — best value */}
              {annualPackage ? (
                <PricingCard
                  pkg={annualPackage}
                  badge="Best Value"
                  savings="Save 33%"
                  selected={
                    selectedPackage?.product.identifier ===
                    annualPackage.product.identifier
                  }
                  onSelect={() => setSelectedPackage(annualPackage)}
                />
              ) : null}
            </View>
          )}

          {/* Error */}
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          {/* CTA */}
          <TouchableOpacity
            style={[
              styles.ctaButton,
              (!selectedPackage || isLoading) && styles.ctaButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={!selectedPackage || isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.ctaText}>{ctaLabel()}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.trialNote}>
            Includes 7-day free trial. Cancel anytime.
          </Text>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleRestore} disabled={isRestoring}>
              <Text style={styles.footerLink}>
                {isRestoring ? 'Restoring…' : 'Restore Purchases'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.footerDot}> · </Text>

            <TouchableOpacity
              onPress={() => Linking.openURL('https://trailguard.app/privacy')}
            >
              <Text style={styles.footerLink}>Privacy</Text>
            </TouchableOpacity>

            <Text style={styles.footerDot}> · </Text>

            <TouchableOpacity
              onPress={() => Linking.openURL('https://trailguard.app/terms')}
            >
              <Text style={styles.footerLink}>Terms</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.legalNote}>
            Subscriptions auto-renew. Manage in App Store Settings.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── PricingCard ──────────────────────────────────────────────────────────────

interface PricingCardProps {
  pkg: PurchasesPackage;
  badge: string | null;
  savings: string | null;
  selected: boolean;
  onSelect: () => void;
}

function PricingCard({ pkg, badge, savings, selected, onSelect }: PricingCardProps) {
  const periodLabel =
    pkg.packageType === 'ANNUAL' ? '/ year' : pkg.packageType === 'MONTHLY' ? '/ month' : '';

  return (
    <TouchableOpacity
      style={[styles.pricingCard, selected && styles.pricingCardSelected]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      {/* Radio */}
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>

      {/* Plan info */}
      <View style={styles.planInfo}>
        <View style={styles.planTitleRow}>
          <Text style={styles.planTitle}>{pkg.product.title}</Text>
          {badge ? (
            <View style={[styles.badge, selected && styles.badgeSelected]}>
              <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        {savings ? <Text style={styles.savingsText}>{savings}</Text> : null}
      </View>

      {/* Price */}
      <View style={styles.priceBlock}>
        <Text style={styles.priceText}>{pkg.product.priceString}</Text>
        <Text style={styles.periodText}>{periodLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dismissBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissIcon: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 56,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Context banner
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}20`,
    borderColor: `${colors.primary}40`,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  lockIcon: {
    fontSize: 18,
  },
  contextText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },

  // Features
  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  featureTextBlock: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  featureDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  checkmark: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 16,
  },

  // Pricing
  pricingLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  loadingPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  pricingCards: {
    gap: 10,
    marginBottom: 20,
  },
  pricingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  pricingCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  planInfo: {
    flex: 1,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
  },
  badgeSelected: {
    backgroundColor: `${colors.primary}25`,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  badgeTextSelected: {
    color: colors.primary,
  },
  savingsText: {
    fontSize: 12,
    color: colors.success,
    marginTop: 2,
    fontWeight: '500',
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  periodText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Error
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },

  // CTA
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textInverse,
    letterSpacing: 0.3,
  },
  trialNote: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  footerLink: {
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  footerDot: {
    color: colors.textMuted,
    fontSize: 12,
  },
  legalNote: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
