/**
 * SubscriptionService — TrailGuard IAP
 *
 * Manages RevenueCat subscriptions, entitlements, and paywall state.
 * Uses react-native-purchases (RevenueCat RN SDK).
 *
 * Pattern mirrors portifi-ios/SubscriptionService.swift.
 *
 * Product IDs:
 *   - com.trailguard.pro.monthly  (Auto-Renewable)
 *   - com.trailguard.pro.yearly   (Auto-Renewable)
 *
 * Usage:
 *   import { SubscriptionService } from './SubscriptionService';
 *   await SubscriptionService.configure(apiKey);
 *   const isPro = await SubscriptionService.checkEntitlement();
 */

import Purchases, {
  type PurchasesPackage,
  type CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';

// ─── Constants ────────────────────────────────────────────────────────────────

export const SUBSCRIPTION_CONFIG = {
  /** RevenueCat entitlement identifier — must match RC dashboard */
  entitlementID: 'pro',

  /** RevenueCat offering identifier */
  offeringID: 'default',

  /** Free-tier limits */
  freeGroupSizeLimit: 3,

  /** Product IDs — must match App Store Connect + RC dashboard */
  productIDs: {
    monthly: 'com.trailguard.pro.monthly',
    yearly: 'com.trailguard.pro.yearly',
  } as const,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro';

export interface SubscriptionStatus {
  isPro: boolean;
  tier: SubscriptionTier;
  expiresAt: Date | null;
}

// ─── Service ─────────────────────────────────────────────────────────────────

class SubscriptionServiceClass {
  private _isConfigured = false;
  private _customerInfo: CustomerInfo | null = null;

  // ── Configuration ──────────────────────────────────────────────────────────

  /**
   * Configure RevenueCat. Call once from App.tsx before first render.
   * Gracefully skips if API key is missing or a placeholder.
   */
  async configure(apiKey: string): Promise<void> {
    if (
      !apiKey ||
      apiKey.startsWith('YOUR_') ||
      apiKey.includes('placeholder') ||
      apiKey.length < 10
    ) {
      if (__DEV__) {
        console.warn(
          '[SubscriptionService] RevenueCat API key not configured — running in free mode'
        );
      }
      this._isConfigured = false;
      return;
    }

    try {
      Purchases.setLogLevel(LOG_LEVEL.WARN);
      await Purchases.configure({ apiKey });
      this._isConfigured = true;

      if (__DEV__) {
        console.log('[SubscriptionService] RevenueCat configured ✅');
      }
    } catch (err) {
      console.error('[SubscriptionService] configure failed:', err);
      this._isConfigured = false;
    }
  }

  get isConfigured(): boolean {
    return this._isConfigured;
  }

  // ── Entitlement Check ──────────────────────────────────────────────────────

  /**
   * Check if the user has an active Pro entitlement.
   * Call on app launch and when returning from background.
   */
  async checkEntitlement(): Promise<boolean> {
    if (!this._isConfigured) {
      return false;
    }

    try {
      const info = await Purchases.getCustomerInfo();
      this._customerInfo = info;
      return this._isEntitlementActive(info);
    } catch (err) {
      console.error('[SubscriptionService] checkEntitlement failed:', err);
      return false;
    }
  }

  /**
   * Get full subscription status including expiry date.
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    if (!this._isConfigured) {
      return { isPro: false, tier: 'free', expiresAt: null };
    }

    try {
      const info = await Purchases.getCustomerInfo();
      this._customerInfo = info;
      const entitlement = info.entitlements.active[SUBSCRIPTION_CONFIG.entitlementID];
      const isPro = !!entitlement;

      return {
        isPro,
        tier: isPro ? 'pro' : 'free',
        expiresAt: entitlement?.expirationDate
          ? new Date(entitlement.expirationDate)
          : null,
      };
    } catch (err) {
      console.error('[SubscriptionService] getSubscriptionStatus failed:', err);
      return { isPro: false, tier: 'free', expiresAt: null };
    }
  }

  // ── Purchase ───────────────────────────────────────────────────────────────

  /**
   * Purchase a RevenueCat package.
   * @returns true on successful purchase, false on failure or user cancellation.
   */
  async purchase(pkg: PurchasesPackage): Promise<boolean> {
    if (!this._isConfigured) {
      throw new Error('Subscription service not configured.');
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      this._customerInfo = customerInfo;
      return this._isEntitlementActive(customerInfo);
    } catch (err: unknown) {
      // User cancelled — not an error
      if (
        err &&
        typeof err === 'object' &&
        'userCancelled' in err &&
        (err as { userCancelled: boolean }).userCancelled
      ) {
        return false;
      }
      throw err;
    }
  }

  // ── Restore ────────────────────────────────────────────────────────────────

  /**
   * Restore previous purchases.
   * @returns true if Pro entitlement was restored.
   */
  async restore(): Promise<boolean> {
    if (!this._isConfigured) {
      throw new Error('Subscription service not configured.');
    }

    try {
      const info = await Purchases.restorePurchases();
      this._customerInfo = info;
      return this._isEntitlementActive(info);
    } catch (err) {
      console.error('[SubscriptionService] restore failed:', err);
      throw err;
    }
  }

  // ── Offerings ──────────────────────────────────────────────────────────────

  /**
   * Fetch available offerings from RevenueCat dashboard.
   * Returns null if not configured or fetch fails.
   */
  async getOfferings() {
    if (!this._isConfigured) {
      return null;
    }

    try {
      const offerings = await Purchases.getOfferings();
      return offerings;
    } catch (err) {
      console.error('[SubscriptionService] getOfferings failed:', err);
      return null;
    }
  }

  // ── Feature Gates ──────────────────────────────────────────────────────────

  /**
   * Can user add more members to a group?
   * Free tier: max 3. Pro: unlimited.
   */
  async canAddGroupMember(currentSize: number): Promise<boolean> {
    if (currentSize < SUBSCRIPTION_CONFIG.freeGroupSizeLimit) return true;
    return this.checkEntitlement();
  }

  /**
   * Can user access satellite bridge features?
   * Satellite bridge is a Pro-only feature.
   */
  async canUseSatelliteBridge(): Promise<boolean> {
    return this.checkEntitlement();
  }

  /**
   * Can user access advanced ride analytics?
   * Advanced analytics (charts, export, replay) require Pro.
   */
  async canUseAdvancedAnalytics(): Promise<boolean> {
    return this.checkEntitlement();
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  private _isEntitlementActive(info: CustomerInfo): boolean {
    return !!info.entitlements.active[SUBSCRIPTION_CONFIG.entitlementID];
  }
}

export const SubscriptionService = new SubscriptionServiceClass();
export default SubscriptionService;
