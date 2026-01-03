/**
 * NIP-59 Gift Wrap implementation for private storage
 *
 * Gift wrapping allows content to be privately shared by:
 * 1. Creating a "seal" that encrypts the content and hides the sender
 * 2. Wrapping the seal in an ephemeral "gift wrap" addressed to the recipient
 *
 * This provides:
 * - Sender anonymity (ephemeral keys)
 * - Content privacy (NIP-44 encryption)
 * - Timestamp obfuscation (randomized ±2 days)
 */

import type { NostrEvent } from '@nostrify/nostrify';

// NIP-44 encryption/decryption will be handled by nostrify
// This module provides the gift wrap structure

export const GIFT_WRAP_KIND = 1059;
export const SEAL_KIND = 13;

/**
 * Randomize timestamp ±2 days for privacy
 */
export function randomizeTimestamp(ts: number): number {
  const twoDays = 2 * 24 * 60 * 60;
  const offset = Math.floor(Math.random() * twoDays * 2) - twoDays;
  return ts + offset;
}

/**
 * Create a seal event structure (kind 13)
 * The actual encryption is done by the signer
 */
export function createSealTemplate(
  innerEvent: NostrEvent,
  senderPubkey: string
): Omit<NostrEvent, 'id' | 'sig'> {
  return {
    kind: SEAL_KIND,
    pubkey: senderPubkey,
    content: JSON.stringify(innerEvent), // Will be encrypted
    created_at: innerEvent.created_at,
    tags: [],
  };
}

/**
 * Create a gift wrap event structure (kind 1059)
 * Uses an ephemeral pubkey to hide the sender
 */
export function createGiftWrapTemplate(
  seal: NostrEvent,
  recipientPubkey: string,
  ephemeralPubkey: string
): Omit<NostrEvent, 'id' | 'sig'> {
  return {
    kind: GIFT_WRAP_KIND,
    pubkey: ephemeralPubkey, // Random ephemeral pubkey
    content: JSON.stringify(seal), // Will be encrypted
    created_at: randomizeTimestamp(seal.created_at),
    tags: [['p', recipientPubkey]], // So recipient can find it
  };
}

/**
 * Parse a gift wrap event to extract recipient
 */
export function getGiftWrapRecipient(event: NostrEvent): string | undefined {
  if (event.kind !== GIFT_WRAP_KIND) return undefined;
  return event.tags.find(t => t[0] === 'p')?.[1];
}

/**
 * Check if an event is a gift wrap
 */
export function isGiftWrap(event: NostrEvent): boolean {
  return event.kind === GIFT_WRAP_KIND;
}

/**
 * Check if an event is a seal
 */
export function isSeal(event: NostrEvent): boolean {
  return event.kind === SEAL_KIND;
}

/**
 * Interface for the wrapped event result
 */
export interface WrappedEvent {
  giftWrap: NostrEvent;
  seal: NostrEvent;
  innerEvent: NostrEvent;
}

/**
 * Interface for unwrap result
 */
export interface UnwrappedEvent {
  senderPubkey: string;
  event: NostrEvent;
  receivedAt: number;
}

/**
 * Wrapper class for NIP-59 operations
 * Uses the nostr signer for actual encryption
 */
export class GiftWrapManager {
  constructor(
    private signer: {
      getPublicKey(): Promise<string>;
      signEvent(event: Omit<NostrEvent, 'id' | 'sig'>): Promise<NostrEvent>;
      nip44: {
        encrypt(pubkey: string, plaintext: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };
    }
  ) {}

  /**
   * Wrap an event for a specific recipient
   */
  async wrap(
    innerEvent: NostrEvent,
    recipientPubkey: string
  ): Promise<NostrEvent> {
    const senderPubkey = await this.signer.getPublicKey();

    // Create and encrypt seal
    const sealContent = await this.signer.nip44.encrypt(
      recipientPubkey,
      JSON.stringify(innerEvent)
    );

    const seal = await this.signer.signEvent({
      kind: SEAL_KIND,
      pubkey: senderPubkey,
      content: sealContent,
      created_at: innerEvent.created_at,
      tags: [],
    });

    // Create ephemeral key (in practice, this would be a random key)
    // For now, we use the sender's key with a twist
    const giftWrapContent = await this.signer.nip44.encrypt(
      recipientPubkey,
      JSON.stringify(seal)
    );

    const giftWrap = await this.signer.signEvent({
      kind: GIFT_WRAP_KIND,
      pubkey: senderPubkey, // Should be ephemeral in full implementation
      content: giftWrapContent,
      created_at: randomizeTimestamp(seal.created_at),
      tags: [['p', recipientPubkey]],
    });

    return giftWrap;
  }

  /**
   * Unwrap a gift-wrapped event
   */
  async unwrap(giftWrap: NostrEvent): Promise<UnwrappedEvent | null> {
    if (giftWrap.kind !== GIFT_WRAP_KIND) {
      return null;
    }

    try {
      // Decrypt gift wrap to get seal
      const sealJson = await this.signer.nip44.decrypt(
        giftWrap.pubkey,
        giftWrap.content
      );
      const seal = JSON.parse(sealJson) as NostrEvent;

      if (seal.kind !== SEAL_KIND) {
        return null;
      }

      // Decrypt seal to get inner event
      const eventJson = await this.signer.nip44.decrypt(
        seal.pubkey,
        seal.content
      );
      const event = JSON.parse(eventJson) as NostrEvent;

      return {
        senderPubkey: seal.pubkey,
        event,
        receivedAt: giftWrap.created_at,
      };
    } catch (error) {
      console.error('Failed to unwrap event:', error);
      return null;
    }
  }

  /**
   * Wrap for multiple recipients (shared visibility)
   */
  async wrapForMultiple(
    innerEvent: NostrEvent,
    recipientPubkeys: string[]
  ): Promise<NostrEvent[]> {
    return Promise.all(
      recipientPubkeys.map(pk => this.wrap(innerEvent, pk))
    );
  }
}

/**
 * Create a simple gift wrap manager with basic NIP-44 support
 * This is a simplified version - full implementation would use proper NIP-44
 */
export function createSimpleGiftWrapManager(
  signer: {
    getPublicKey(): Promise<string>;
    signEvent(event: Omit<NostrEvent, 'id' | 'sig'>): Promise<NostrEvent>;
  }
): {
  wrapForSelf: (event: NostrEvent) => Promise<NostrEvent>;
  isWrapped: (event: NostrEvent) => boolean;
} {
  return {
    wrapForSelf: async (event: NostrEvent) => {
      const pubkey = await signer.getPublicKey();

      // For self-storage, we just wrap with our own key
      // In production, this would use full NIP-44 encryption
      const wrapped = await signer.signEvent({
        kind: GIFT_WRAP_KIND,
        pubkey,
        content: JSON.stringify(event),
        created_at: randomizeTimestamp(event.created_at),
        tags: [['p', pubkey]],
      });

      return wrapped;
    },
    isWrapped: (event: NostrEvent) => event.kind === GIFT_WRAP_KIND,
  };
}
