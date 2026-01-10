/**
 * Billing & Pricing Module
 *
 * Handles usage tracking, pricing calculations, and billing operations
 * for CDN storage and bandwidth.
 *
 * Tier model:
 * - FREE: Unlimited local, 100MB Blossom, no CDN, no paywalls
 * - PAID (pro/paygo): Bunny CDN, signed URLs, paywalls work
 */

import { db, type UsageRecord, type BillingSettings } from '@/lib/storage';

/**
 * Pricing tiers and limits
 *
 * Key insight: Paywalls require signed URLs. Blossom URLs are public.
 * Therefore monetization requires paid tier.
 */
export const PRICING = {
  free: {
    blossomLimit: 100 * 1024 * 1024,  // 100 MB on Blossom network
    hasBunny: false,
    hasPaywalls: false,
    // Legacy fields for compatibility
    storageLimit: 100 * 1024 * 1024,
    bandwidthLimit: Infinity,
    storagePricePerGb: 0,
    bandwidthPricePerGb: 0,
  },
  pro: {
    monthlyPriceSats: 5000,                        // ~$5
    bunnyStorageLimit: 10 * 1024 * 1024 * 1024,    // 10 GB
    bunnyBandwidthLimit: 100 * 1024 * 1024 * 1024, // 100 GB/month
    hasBunny: true,
    hasPaywalls: true,
    // Legacy fields for compatibility
    storageLimit: 10 * 1024 * 1024 * 1024,
    bandwidthLimit: 100 * 1024 * 1024 * 1024,
    storagePricePerGb: 0,
    bandwidthPricePerGb: 0,
  },
  paygo: {
    storagePricePerGb: 100,   // sats per GB/month (~$0.10)
    bandwidthPricePerGb: 100, // sats per GB
    hasBunny: true,
    hasPaywalls: true,
    // Legacy fields for compatibility
    storageLimit: Infinity,
    bandwidthLimit: Infinity,
  },
} as const;

export type PlanType = keyof typeof PRICING;

/**
 * Approximate sats to USD conversion rate
 * Should be fetched from a live API in production
 */
const SATS_TO_USD_RATE = 0.001;

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format sats to display with USD equivalent
 */
export function formatSatsWithUSD(sats: number): string {
  const usd = sats * SATS_TO_USD_RATE;
  return `${sats.toLocaleString()} sats (~$${usd.toFixed(2)})`;
}

/**
 * Format sats to compact display
 */
export function formatSats(sats: number): string {
  if (sats >= 1_000_000) {
    return `${(sats / 1_000_000).toFixed(1)}M sats`;
  }
  if (sats >= 1_000) {
    return `${(sats / 1_000).toFixed(1)}k sats`;
  }
  return `${sats} sats`;
}

/**
 * Get current billing month as YYYY-MM
 */
export function getCurrentBillingMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Calculate storage cost for a given number of bytes
 */
export function calculateStorageCost(
  bytes: number,
  plan: PlanType
): number {
  const pricing = PRICING[plan];
  if (pricing.storagePricePerGb === 0) return 0;

  const gb = bytes / (1024 * 1024 * 1024);
  return Math.ceil(gb * pricing.storagePricePerGb);
}

/**
 * Calculate bandwidth cost for a given number of bytes
 */
export function calculateBandwidthCost(
  bytes: number,
  plan: PlanType
): number {
  const pricing = PRICING[plan];
  if (pricing.bandwidthPricePerGb === 0) return 0;

  const gb = bytes / (1024 * 1024 * 1024);
  return Math.ceil(gb * pricing.bandwidthPricePerGb);
}

/**
 * Calculate total cost for current usage
 */
export function calculateTotalCost(
  storageBytes: number,
  bandwidthBytes: number,
  plan: PlanType
): { storageCost: number; bandwidthCost: number; total: number } {
  const storageCost = calculateStorageCost(storageBytes, plan);
  const bandwidthCost = calculateBandwidthCost(bandwidthBytes, plan);

  // For pro plan, it's a flat monthly fee
  if (plan === 'pro') {
    return {
      storageCost: 0,
      bandwidthCost: 0,
      total: PRICING.pro.monthlyPriceSats,
    };
  }

  return {
    storageCost,
    bandwidthCost,
    total: storageCost + bandwidthCost,
  };
}

/**
 * Check if user is within plan limits
 */
export function checkPlanLimits(
  storageBytes: number,
  bandwidthBytes: number,
  plan: PlanType
): { withinLimits: boolean; storageOk: boolean; bandwidthOk: boolean } {
  const pricing = PRICING[plan];
  const storageOk = storageBytes <= pricing.storageLimit;
  const bandwidthOk = bandwidthBytes <= pricing.bandwidthLimit;

  return {
    withinLimits: storageOk && bandwidthOk,
    storageOk,
    bandwidthOk,
  };
}

/**
 * Get usage percentage for progress bars
 */
export function getUsagePercentage(
  used: number,
  limit: number
): number {
  if (limit === Infinity) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

/**
 * Get or create current month's usage record
 */
export async function getOrCreateUsageRecord(): Promise<UsageRecord> {
  const id = getCurrentBillingMonth();
  let record = await db.usageRecords.get(id);

  if (!record) {
    record = {
      id,
      storageBytes: 0,
      bandwidthBytes: 0,
      storageCost: 0,
      bandwidthCost: 0,
    };
    await db.usageRecords.put(record);
  }

  return record;
}

/**
 * Update usage record with new upload
 */
export async function recordUpload(sizeBytes: number): Promise<void> {
  const record = await getOrCreateUsageRecord();
  const settings = await getBillingSettings();

  record.storageBytes += sizeBytes;

  // Recalculate costs
  const costs = calculateTotalCost(record.storageBytes, record.bandwidthBytes, settings.plan);
  record.storageCost = costs.storageCost;

  await db.usageRecords.put(record);
}

/**
 * Update usage record with bandwidth usage
 */
export async function recordBandwidth(bytes: number): Promise<void> {
  const record = await getOrCreateUsageRecord();
  const settings = await getBillingSettings();

  record.bandwidthBytes += bytes;

  // Recalculate costs
  const costs = calculateTotalCost(record.storageBytes, record.bandwidthBytes, settings.plan);
  record.bandwidthCost = costs.bandwidthCost;

  await db.usageRecords.put(record);
}

/**
 * Get billing settings
 */
export async function getBillingSettings(): Promise<BillingSettings> {
  const settings = await db.settings.get('billing');
  return (settings?.value as BillingSettings) ?? {
    plan: 'free',
    satBalance: 0,
    autoPayFromEarnings: false,
  };
}

/**
 * Update billing settings
 */
export async function setBillingSettings(
  updates: Partial<BillingSettings>
): Promise<void> {
  const current = await getBillingSettings();
  await db.settings.put({
    key: 'billing',
    value: { ...current, ...updates },
  });
}

/**
 * Add sats to balance
 */
export async function addToBalance(amount: number): Promise<number> {
  const settings = await getBillingSettings();
  const newBalance = settings.satBalance + amount;
  await setBillingSettings({
    satBalance: newBalance,
    lastTopUp: Date.now(),
  });
  return newBalance;
}

/**
 * Deduct from balance
 */
export async function deductFromBalance(amount: number): Promise<boolean> {
  const settings = await getBillingSettings();
  if (settings.satBalance < amount) {
    return false;
  }
  await setBillingSettings({
    satBalance: settings.satBalance - amount,
  });
  return true;
}

/**
 * Process monthly billing
 */
export async function processMonthlyBilling(): Promise<{
  success: boolean;
  charged: number;
  error?: string;
}> {
  const settings = await getBillingSettings();
  const record = await getOrCreateUsageRecord();

  let amountDue = 0;

  if (settings.plan === 'pro') {
    amountDue = PRICING.pro.monthlyPriceSats;
  } else if (settings.plan === 'paygo') {
    amountDue = record.storageCost + record.bandwidthCost;
  }

  if (amountDue === 0) {
    return { success: true, charged: 0 };
  }

  if (settings.satBalance < amountDue) {
    return {
      success: false,
      charged: 0,
      error: `Insufficient balance: need ${amountDue} sats, have ${settings.satBalance}`,
    };
  }

  const deducted = await deductFromBalance(amountDue);
  if (!deducted) {
    return { success: false, charged: 0, error: 'Failed to deduct balance' };
  }

  // Mark record as paid
  record.paidAt = Date.now();
  await db.usageRecords.put(record);

  return { success: true, charged: amountDue };
}

/**
 * Estimate how long current balance will last
 */
export async function estimateBalanceRunway(): Promise<{
  days: number;
  date: Date | null;
}> {
  const settings = await getBillingSettings();
  const record = await getOrCreateUsageRecord();

  if (settings.plan === 'free') {
    return { days: Infinity, date: null };
  }

  let monthlyCost = 0;
  if (settings.plan === 'pro') {
    monthlyCost = PRICING.pro.monthlyPriceSats;
  } else {
    monthlyCost = record.storageCost + record.bandwidthCost;
  }

  if (monthlyCost === 0) {
    return { days: Infinity, date: null };
  }

  const dailyCost = monthlyCost / 30;
  const daysRemaining = Math.floor(settings.satBalance / dailyCost);

  const runwayDate = new Date();
  runwayDate.setDate(runwayDate.getDate() + daysRemaining);

  return {
    days: daysRemaining,
    date: runwayDate,
  };
}

/**
 * Get usage history for charts
 */
export async function getUsageHistory(
  months: number = 6
): Promise<UsageRecord[]> {
  const records = await db.usageRecords
    .orderBy('id')
    .reverse()
    .limit(months)
    .toArray();

  return records.reverse();
}

/**
 * Check if user can upload based on plan limits
 */
export async function canUpload(fileSize: number): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const settings = await getBillingSettings();
  const record = await getOrCreateUsageRecord();

  const newTotal = record.storageBytes + fileSize;
  const limits = checkPlanLimits(newTotal, record.bandwidthBytes, settings.plan);

  if (!limits.storageOk) {
    return {
      allowed: false,
      reason: `Storage limit exceeded. Upgrade to Pro or Pay-as-you-go for more storage.`,
    };
  }

  // For paygo, check if balance can cover the upload
  if (settings.plan === 'paygo') {
    const uploadCost = calculateStorageCost(fileSize, 'paygo');
    if (settings.satBalance < uploadCost) {
      return {
        allowed: false,
        reason: `Insufficient balance for upload. Need ${uploadCost} sats.`,
      };
    }
  }

  return { allowed: true };
}

// ============================================================================
// Blossom Usage Tracking (Free Tier)
// ============================================================================

/**
 * Get total Blossom storage used
 */
export async function getBlossomUsage(): Promise<number> {
  const uploads = await db.blossomUploads.toArray();
  return uploads.reduce((sum, u) => sum + u.size, 0);
}

/**
 * Record a Blossom upload
 */
export async function recordBlossomUpload(
  hash: string,
  url: string,
  size: number
): Promise<void> {
  await db.blossomUploads.put({
    hash,
    url,
    size,
    uploadedAt: Date.now(),
  });
}

/**
 * Check if user can upload to Blossom (free tier limit check)
 */
export async function canUploadToBlossom(fileSize: number): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const used = await getBlossomUsage();
  const limit = PRICING.free.blossomLimit;

  if (used + fileSize > limit) {
    return {
      allowed: false,
      reason: `Blossom storage limit reached (${formatBytes(limit)}). Upgrade to Pro for CDN storage.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if plan has CDN (Bunny) access
 */
export function hasCdnAccess(plan: PlanType): boolean {
  return PRICING[plan].hasBunny;
}

/**
 * Check if plan has paywall capability
 */
export function hasPaywallAccess(plan: PlanType): boolean {
  return PRICING[plan].hasPaywalls;
}
