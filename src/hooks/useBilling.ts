/**
 * Billing Hook
 *
 * Provides reactive access to billing state, usage records, and plan management.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type UsageRecord, type BillingSettings } from "@/lib/storage";
import {
  getBillingSettings,
  setBillingSettings,
  getOrCreateUsageRecord,
  addToBalance,
  deductFromBalance,
  estimateBalanceRunway,
  getUsageHistory,
  calculateTotalCost,
  checkPlanLimits,
  getBlossomUsage,
  hasCdnAccess,
  hasPaywallAccess,
  PRICING,
  type PlanType,
} from "@/lib/billing";
import { getTotalStorageUsed } from "./useUploadFile";

/**
 * Hook for accessing billing settings
 */
export function useBillingSettings() {
  return useQuery({
    queryKey: ['billing', 'settings'],
    queryFn: getBillingSettings,
  });
}

/**
 * Hook for accessing current month's usage
 */
export function useCurrentUsage() {
  const usage = useLiveQuery(async () => {
    return getOrCreateUsageRecord();
  });

  return {
    data: usage,
    isLoading: usage === undefined,
  };
}

/**
 * Hook for usage history (for charts)
 */
export function useUsageHistory(months: number = 6) {
  return useQuery({
    queryKey: ['billing', 'history', months],
    queryFn: () => getUsageHistory(months),
  });
}

/**
 * Hook for total CDN storage used
 */
export function useStorageUsed() {
  const storage = useLiveQuery(async () => {
    return getTotalStorageUsed();
  });

  return {
    data: storage ?? 0,
    isLoading: storage === undefined,
  };
}

/**
 * Hook for Blossom storage used (free tier)
 */
export function useBlossomUsage() {
  const usage = useLiveQuery(async () => {
    return getBlossomUsage();
  });

  return {
    data: usage ?? 0,
    isLoading: usage === undefined,
  };
}

/**
 * Hook for balance runway estimation
 */
export function useBalanceRunway() {
  return useQuery({
    queryKey: ['billing', 'runway'],
    queryFn: estimateBalanceRunway,
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Hook for updating billing plan
 */
export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: PlanType) => {
      await setBillingSettings({ plan });
      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

/**
 * Hook for topping up balance
 */
export function useTopUpBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      return addToBalance(amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

/**
 * Hook for toggling auto-pay from earnings
 */
export function useToggleAutoPay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      await setBillingSettings({ autoPayFromEarnings: enabled });
      return enabled;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

/**
 * Combined billing hook with all billing state
 */
export function useBilling() {
  const { data: settings, isLoading: settingsLoading } = useBillingSettings();
  const { data: usage, isLoading: usageLoading } = useCurrentUsage();
  const { data: storageUsed, isLoading: storageLoading } = useStorageUsed();
  const { data: blossomUsage, isLoading: blossomLoading } = useBlossomUsage();
  const { data: runway } = useBalanceRunway();

  const updatePlan = useUpdatePlan();
  const topUp = useTopUpBalance();
  const toggleAutoPay = useToggleAutoPay();

  const plan = settings?.plan ?? 'free';
  const pricing = PRICING[plan];

  const costs = usage
    ? calculateTotalCost(usage.storageBytes, usage.bandwidthBytes, plan)
    : { storageCost: 0, bandwidthCost: 0, total: 0 };

  const limits = usage
    ? checkPlanLimits(usage.storageBytes, usage.bandwidthBytes, plan)
    : { withinLimits: true, storageOk: true, bandwidthOk: true };

  // Plan capabilities
  const hasCdn = hasCdnAccess(plan);
  const hasPaywalls = hasPaywallAccess(plan);

  return {
    // State
    settings,
    usage,
    storageUsed,
    blossomUsage,
    runway,
    costs,
    limits,
    pricing,

    // Plan capabilities
    hasCdn,
    hasPaywalls,

    // Loading states
    isLoading: settingsLoading || usageLoading || storageLoading || blossomLoading,

    // Mutations
    updatePlan: updatePlan.mutate,
    isUpdatingPlan: updatePlan.isPending,

    topUp: topUp.mutate,
    isToppingUp: topUp.isPending,

    toggleAutoPay: toggleAutoPay.mutate,
    isTogglingAutoPay: toggleAutoPay.isPending,
  };
}
