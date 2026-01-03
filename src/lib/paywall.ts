import { db, type ArticleUnlock, type LocalArticle } from '@/lib/storage';

// TODO: Install @cashu/cashu-ts package for production
// import { CashuMint, CashuWallet, getEncodedToken, getDecodedToken } from '@cashu/cashu-ts';

/**
 * Default Cashu mint URL for paywall payments
 */
export const DEFAULT_MINT_URL = 'https://mint.minibits.cash/Bitcoin';

/**
 * Approximate exchange rate for sats to USD
 * This should ideally be fetched from a live API in production
 */
const SATS_TO_USD_RATE = 0.0004;

/**
 * Payment request structure for article unlocks
 */
export interface PaymentRequest {
  articleDTag: string;
  articleAuthor: string;
  articleTitle: string;
  price: number;           // Sats
  mintUrl: string;
  invoice?: string;        // Lightning invoice (optional)
  timestamp: number;
}

/**
 * Paywall configuration from article metadata
 */
export interface PaywallConfig {
  price: number;           // Sats
  previewLength: number;   // Characters shown for free
  mintUrl: string;
}

/**
 * Content structure with paywall applied
 */
export interface PaywalledContent {
  preview: string;
  premium: string | null;
  isComplete: boolean;
}

// ============================================================================
// Core Paywall Functions (as specified by user)
// ============================================================================

/**
 * Convert sats to USD display string using approximate exchange rate
 *
 * @param sats - Amount in satoshis
 * @returns Formatted USD string (e.g., "$0.40")
 *
 * @example
 * formatSatsToUSD(1000) // "$0.40"
 * formatSatsToUSD(5000) // "$2.00"
 */
export function formatSatsToUSD(sats: number): string {
  const usd = sats * SATS_TO_USD_RATE;
  return `$${usd.toFixed(2)}`;
}

/**
 * Generate a Cashu payment request for an article
 *
 * @param article - The article to generate payment for
 * @param mintUrl - Optional mint URL (uses default if not provided)
 * @returns Payment request object
 *
 * @example
 * const invoice = await generatePaywallInvoice(article);
 * // Returns: { articleDTag: "my-article", price: 1000, ... }
 */
export async function generatePaywallInvoice(
  article: LocalArticle | { id: string; title: string; paywallPrice?: number; paywallMintUrl?: string; pubkey?: string },
  mintUrl?: string
): Promise<PaymentRequest> {
  const price = article.paywallPrice || 1000;
  const mint = mintUrl || article.paywallMintUrl || DEFAULT_MINT_URL;

  // TODO: In production, generate actual Lightning invoice via backend
  // This would involve:
  // 1. Call your backend API to generate a Lightning invoice
  // 2. Include article metadata in invoice description
  // 3. Set up webhook for payment verification

  const request: PaymentRequest = {
    articleDTag: article.id,
    articleAuthor: (article as any).pubkey || 'unknown',
    articleTitle: article.title || 'Untitled Article',
    price,
    mintUrl: mint,
    timestamp: Date.now(),
  };

  return request;
}

/**
 * Verify a Cashu token payment is valid and matches expected amount
 *
 * @param token - The Cashu token string to verify
 * @param expectedAmount - Expected amount in sats
 * @returns True if payment is valid, throws error otherwise
 *
 * @example
 * await verifyPaywallPayment("cashuA...", 1000);
 */
export async function verifyPaywallPayment(
  token: string,
  expectedAmount: number
): Promise<boolean> {
  // TODO: Implement actual Cashu token verification
  // This requires @cashu/cashu-ts package:
  //
  // 1. Decode token:
  //    const decoded = getDecodedToken(token);
  //
  // 2. Verify token amount:
  //    const totalAmount = decoded.token.reduce((sum, t) =>
  //      sum + t.proofs.reduce((s, p) => s + p.amount, 0), 0
  //    );
  //
  // 3. Check amount is sufficient:
  //    if (totalAmount < expectedAmount) {
  //      throw new Error(`Insufficient payment: got ${totalAmount}, need ${expectedAmount}`);
  //    }
  //
  // 4. Verify token is not spent (call mint):
  //    const mint = new CashuMint(decoded.token[0].mint);
  //    const wallet = new CashuWallet(mint);
  //    await wallet.receive(token);
  //
  // 5. Return true if all checks pass

  // Stub implementation - validates format only
  if (!token || !token.startsWith('cashu')) {
    throw new Error('Invalid Cashu token format');
  }

  if (expectedAmount <= 0) {
    throw new Error('Expected amount must be positive');
  }

  // In production, this would actually verify the token with the mint
  console.warn('[Paywall] TODO: Implement actual Cashu token verification');

  return true;
}

/**
 * Check if a reader has unlocked an article
 *
 * @param articleDTag - The article's d-tag identifier
 * @param readerPubkey - The reader's nostr pubkey
 * @returns True if article is unlocked for this reader
 *
 * @example
 * const unlocked = await checkArticleUnlock("my-article", userPubkey);
 * if (unlocked) {
 *   // Show full content
 * }
 */
export async function checkArticleUnlock(
  articleDTag: string,
  readerPubkey: string
): Promise<boolean> {
  const unlockId = `${readerPubkey}:${articleDTag}`;
  const unlock = await db.unlocks.get(unlockId);
  return !!unlock;
}

// ============================================================================
// Additional Paywall Helper Functions
// ============================================================================

/**
 * Get article content with paywall applied
 * Returns preview and premium sections based on unlock status
 *
 * @param content - Full article content (markdown)
 * @param paywall - Paywall configuration
 * @param isUnlocked - Whether user has unlocked the article
 * @returns Content split into preview and premium sections
 */
export function getPaywalledContent(
  content: string,
  paywall: PaywallConfig,
  isUnlocked: boolean
): PaywalledContent {
  if (isUnlocked || !paywall) {
    return {
      preview: content,
      premium: null,
      isComplete: true,
    };
  }

  // Split at preview length, trying to break at paragraph
  const previewLength = paywall.previewLength;
  let breakPoint = content.indexOf('\n\n', previewLength - 100);

  // No good paragraph break, just cut at length
  if (breakPoint === -1 || breakPoint > previewLength + 200) {
    breakPoint = previewLength;
  }

  return {
    preview: content.slice(0, breakPoint),
    premium: content.slice(breakPoint),
    isComplete: false,
  };
}

/**
 * Process a Cashu token payment and record the unlock
 *
 * @param token - Cashu token string
 * @param request - Payment request details
 * @param readerPubkey - Reader's nostr pubkey
 * @returns The created unlock record
 */
export async function processTokenPayment(
  token: string,
  request: PaymentRequest,
  readerPubkey: string
): Promise<ArticleUnlock> {
  // TODO: Implement actual token decoding with @cashu/cashu-ts
  // const decoded = getDecodedToken(token);
  // const totalAmount = decoded.token.reduce((sum, t) =>
  //   sum + t.proofs.reduce((s, p) => s + p.amount, 0), 0
  // );

  // Stub: assume token is valid for the requested amount
  const totalAmount = request.price;

  // Verify token format
  await verifyPaywallPayment(token, request.price);

  // TODO: Verify token is from expected mint
  // const tokenMint = decoded.token[0]?.mint;
  // if (tokenMint !== request.mintUrl) {
  //   throw new Error(`Token from wrong mint: got ${tokenMint}, expected ${request.mintUrl}`);
  // }

  // TODO: Redeem token to verify it's valid and not double-spent
  // const mint = new CashuMint(request.mintUrl);
  // const wallet = new CashuWallet(mint);
  // const received = await wallet.receive(token);

  // Record the unlock in local database
  const unlockId = `${readerPubkey}:${request.articleDTag}`;
  const unlock: ArticleUnlock = {
    id: unlockId,
    articleDTag: request.articleDTag,
    articleAuthor: request.articleAuthor,
    readerPubkey,
    unlockedAt: Date.now(),
    paymentProof: token,
    amountPaid: totalAmount,
  };

  await db.unlocks.put(unlock);

  // TODO: Forward payment to author (minus platform fee)
  // This would involve:
  // 1. Redeem token to platform wallet
  // 2. Calculate platform fee (e.g., 10%)
  // 3. Create new token for author (amount - fee)
  // 4. Send to author via NIP-04 DM or Nostr wallet connect

  return unlock;
}

/**
 * Process a Lightning payment and record the unlock
 *
 * @param preimage - Lightning payment preimage (proof of payment)
 * @param request - Payment request details
 * @param readerPubkey - Reader's nostr pubkey
 * @returns The created unlock record
 */
export async function processLightningPayment(
  preimage: string,
  request: PaymentRequest,
  readerPubkey: string
): Promise<ArticleUnlock> {
  // TODO: Verify preimage matches invoice hash
  // This requires backend infrastructure to:
  // 1. Store invoice hash when generating invoice
  // 2. Verify sha256(preimage) === invoice_hash
  // 3. Confirm payment was received for correct amount

  const unlockId = `${readerPubkey}:${request.articleDTag}`;
  const unlock: ArticleUnlock = {
    id: unlockId,
    articleDTag: request.articleDTag,
    articleAuthor: request.articleAuthor,
    readerPubkey,
    unlockedAt: Date.now(),
    paymentProof: preimage,
    amountPaid: request.price,
  };

  await db.unlocks.put(unlock);

  return unlock;
}

/**
 * Get all articles a reader has unlocked
 *
 * @param readerPubkey - Reader's nostr pubkey
 * @returns Array of unlock records
 */
export async function getUnlockedArticles(
  readerPubkey: string
): Promise<ArticleUnlock[]> {
  return db.unlocks
    .where('readerPubkey')
    .equals(readerPubkey)
    .toArray();
}

/**
 * Get earnings statistics for an author
 *
 * @param authorPubkey - Author's nostr pubkey
 * @returns Total earnings and breakdown by article
 */
export async function getAuthorEarnings(authorPubkey: string): Promise<{
  total: number;
  byArticle: { articleId: string; amount: number; count: number }[];
}> {
  const unlocks = await db.unlocks
    .where('articleAuthor')
    .equals(authorPubkey)
    .toArray();

  const total = unlocks.reduce((sum, u) => sum + u.amountPaid, 0);

  const byArticle = new Map<string, { amount: number; count: number }>();
  for (const unlock of unlocks) {
    const existing = byArticle.get(unlock.articleDTag) || { amount: 0, count: 0 };
    byArticle.set(unlock.articleDTag, {
      amount: existing.amount + unlock.amountPaid,
      count: existing.count + 1,
    });
  }

  return {
    total,
    byArticle: Array.from(byArticle.entries()).map(([articleId, data]) => ({
      articleId,
      ...data,
    })),
  };
}

/**
 * Delete an unlock record (for testing/debugging)
 *
 * @param articleDTag - Article identifier
 * @param readerPubkey - Reader's pubkey
 */
export async function deleteUnlock(
  articleDTag: string,
  readerPubkey: string
): Promise<void> {
  const unlockId = `${readerPubkey}:${articleDTag}`;
  await db.unlocks.delete(unlockId);
}

/**
 * Get all unlocks for a specific article (author analytics)
 *
 * @param articleDTag - Article identifier
 * @returns Array of unlocks for this article
 */
export async function getArticleUnlocks(
  articleDTag: string
): Promise<ArticleUnlock[]> {
  return db.unlocks
    .where('articleDTag')
    .equals(articleDTag)
    .toArray();
}
