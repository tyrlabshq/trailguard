/**
 * SubscriptionContext — TrailGuard IAP
 *
 * React context that wraps SubscriptionService for use throughout the app.
 * Provides isPro state, paywall trigger, and purchase/restore methods.
 *
 * Usage:
 *   1. Wrap app in <SubscriptionProvider> (done in App.tsx)
 *   2. Use hook: const { isPro, triggerPaywall } = useSubscription();
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import SubscriptionService from '../services/SubscriptionService';

// ─── Context Shape ────────────────────────────────────────────────────────────

interface SubscriptionContextValue {
  /** Whether user has active Pro entitlement */
  isPro: boolean;
  /** Loading state during purchase/restore */
  isLoading: boolean;
  /** Error message from last operation */
  errorMessage: string | null;
  /** Whether paywall modal should be shown */
  showPaywall: boolean;
  /** Context string for the paywall header (e.g. "Upgrade for larger groups") */
  paywallContext: string | null;

  /** Refresh entitlement status from RevenueCat */
  refreshStatus: () => Promise<void>;
  /** Show paywall — only if user is not already Pro */
  triggerPaywall: (context?: string) => void;
  /** Hide paywall */
  dismissPaywall: () => void;
  /** Purchase a package */
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  /** Restore previous purchases */
  restore: () => Promise<boolean>;
  /** Clear error message */
  clearError: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallContext, setPaywallContext] = useState<string | null>(null);

  // ── Refresh on mount and foreground ────────────────────────────────────────

  const refreshStatus = useCallback(async () => {
    const active = await SubscriptionService.checkEntitlement();
    setIsPro(active);
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        refreshStatus();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [refreshStatus]);

  // ── Paywall ────────────────────────────────────────────────────────────────

  const triggerPaywall = useCallback(
    (context?: string) => {
      if (isPro) return;
      setPaywallContext(context ?? null);
      setShowPaywall(true);
    },
    [isPro]
  );

  const dismissPaywall = useCallback(() => {
    setShowPaywall(false);
    setPaywallContext(null);
  }, []);

  // ── Purchase ───────────────────────────────────────────────────────────────

  const purchase = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const success = await SubscriptionService.purchase(pkg);
      if (success) {
        setIsPro(true);
        setShowPaywall(false);
      }
      return success;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Purchase failed. Please try again.';
      setErrorMessage(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Restore ────────────────────────────────────────────────────────────────

  const restore = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const restored = await SubscriptionService.restore();
      if (restored) {
        setIsPro(true);
        setShowPaywall(false);
      }
      return restored;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Restore failed. Please try again.';
      setErrorMessage(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setErrorMessage(null), []);

  return (
    <SubscriptionContext.Provider
      value={{
        isPro,
        isLoading,
        errorMessage,
        showPaywall,
        paywallContext,
        refreshStatus,
        triggerPaywall,
        dismissPaywall,
        purchase,
        restore,
        clearError,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return ctx;
}

export default SubscriptionContext;
