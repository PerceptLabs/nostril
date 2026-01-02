import { useCallback, useMemo } from "react";
import { useNostr } from "@nostrify/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";
import { useNostrPublish } from "./useNostrPublish";
import { parseSaveEvent, type ParsedSave } from "@/lib/nostril";
import { nanoid } from "nanoid";

/**
 * NIP-51 List kinds:
 * - 10000: Mute list
 * - 10001: Private bookmarks (encrypted)
 * - 30000: Follow sets
 * - 30001: Generic lists (what we use for collections)
 */
const LIST_KIND = 30001;

export interface Collection {
  id: string;
  dTag: string;
  name: string;
  description?: string;
  image?: string;
  isPublic: boolean;
  saveIds: string[]; // d-tags of saves in this collection
  createdAt: Date;
  updatedAt: Date;
  author: {
    pubkey: string;
    name?: string;
    picture?: string;
  };
}

/**
 * Parse a NIP-51 list event into a Collection
 */
function parseListEvent(event: { id: string; kind: number; tags: string[][]; content: string; pubkey: string; created_at: number }): Collection | null {
  try {
    const dTag = event.tags.find((t) => t[0] === "d")?.[1];
    if (!dTag) return null;

    const name = event.tags.find((t) => t[0] === "name")?.[1] ||
                 event.tags.find((t) => t[0] === "title")?.[1] ||
                 dTag;

    const description = event.tags.find((t) => t[0] === "description")?.[1];
    const image = event.tags.find((t) => t[0] === "image")?.[1];

    // Get all 'a' tags that reference our save events (kind 30078)
    // Format: ["a", "30078:pubkey:d-tag"]
    const saveIds = event.tags
      .filter((t) => t[0] === "a" && t[1]?.startsWith("30078:"))
      .map((t) => {
        const parts = t[1].split(":");
        return parts[2]; // Get the d-tag
      })
      .filter(Boolean);

    // Also support 'e' tags for event IDs
    const eventRefs = event.tags
      .filter((t) => t[0] === "e")
      .map((t) => t[1]);

    return {
      id: event.id,
      dTag,
      name,
      description,
      image,
      isPublic: true, // NIP-51 lists are public by default
      saveIds: [...saveIds, ...eventRefs],
      createdAt: new Date(event.created_at * 1000),
      updatedAt: new Date(event.created_at * 1000),
      author: {
        pubkey: event.pubkey,
      },
    };
  } catch (error) {
    console.error("Failed to parse list event:", error);
    return null;
  }
}

/**
 * Hook to get all collections for the current user
 */
export function useCollections() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["collections", user?.pubkey],
    queryFn: async (c) => {
      if (!user) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      const events = await nostr.query(
        [{ kinds: [LIST_KIND], authors: [user.pubkey] }],
        { signal }
      );

      return events
        .map(parseListEvent)
        .filter((c): c is Collection => c !== null)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    },
    enabled: !!user,
    staleTime: 30000,
  });
}

/**
 * Hook to get a single collection by d-tag
 */
export function useCollection(dTag: string | undefined) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["collection", dTag],
    queryFn: async (c) => {
      if (!dTag) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Try to fetch from current user first, then from anyone
      const filters = user
        ? [{ kinds: [LIST_KIND], authors: [user.pubkey], "#d": [dTag] }]
        : [{ kinds: [LIST_KIND], "#d": [dTag] }];

      const events = await nostr.query(filters, { signal });

      if (events.length === 0) return null;
      return parseListEvent(events[0]);
    },
    enabled: !!dTag,
  });
}

/**
 * Hook to get saves in a collection
 */
export function useCollectionSaves(collection: Collection | null | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["collection-saves", collection?.id, collection?.saveIds],
    queryFn: async (c) => {
      if (!collection || collection.saveIds.length === 0) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      // Fetch saves by their d-tags
      const events = await nostr.query(
        [{ kinds: [30078], "#d": collection.saveIds }],
        { signal }
      );

      return events
        .map(parseSaveEvent)
        .filter((s): s is ParsedSave => s !== null)
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    },
    enabled: !!collection && collection.saveIds.length > 0,
  });
}

/**
 * Hook to create a new collection
 */
export function useCreateCollection() {
  const { user } = useCurrentUser();
  const { mutateAsync: publish, isPending } = useNostrPublish();
  const queryClient = useQueryClient();

  const createCollection = useCallback(
    async (data: { name: string; description?: string; image?: string }): Promise<string | null> => {
      if (!user) {
        throw new Error("Must be logged in to create collections");
      }

      const dTag = nanoid(10);
      const tags: string[][] = [
        ["d", dTag],
        ["name", data.name],
      ];

      if (data.description) {
        tags.push(["description", data.description]);
      }

      if (data.image) {
        tags.push(["image", data.image]);
      }

      const eventData = {
        kind: LIST_KIND,
        content: "",
        tags,
      };

      const event = await publish(eventData);

      if (event) {
        queryClient.invalidateQueries({ queryKey: ["collections"] });
      }

      return event?.id || null;
    },
    [user, publish, queryClient]
  );

  return { createCollection, isPending };
}

/**
 * Hook to update a collection (add/remove saves, change metadata)
 */
export function useUpdateCollection() {
  const { user } = useCurrentUser();
  const { mutateAsync: publish, isPending } = useNostrPublish();
  const queryClient = useQueryClient();

  const updateCollection = useCallback(
    async (
      collection: Collection,
      updates: {
        name?: string;
        description?: string;
        image?: string;
        addSaves?: ParsedSave[];
        removeSaveIds?: string[];
      }
    ): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to update collections");
      }

      // Build updated save IDs list
      let saveIds = [...collection.saveIds];

      if (updates.removeSaveIds) {
        saveIds = saveIds.filter((id) => !updates.removeSaveIds!.includes(id));
      }

      if (updates.addSaves) {
        const newIds = updates.addSaves.map((s) => s.dTag);
        saveIds = [...new Set([...saveIds, ...newIds])];
      }

      const tags: string[][] = [
        ["d", collection.dTag],
        ["name", updates.name || collection.name],
      ];

      if (updates.description ?? collection.description) {
        tags.push(["description", updates.description ?? collection.description!]);
      }

      if (updates.image ?? collection.image) {
        tags.push(["image", updates.image ?? collection.image!]);
      }

      // Add all saves as 'a' tags
      saveIds.forEach((saveId) => {
        tags.push(["a", `30078:${user.pubkey}:${saveId}`]);
      });

      const eventData = {
        kind: LIST_KIND,
        content: "",
        tags,
      };

      const event = await publish(eventData);

      if (event) {
        queryClient.invalidateQueries({ queryKey: ["collections"] });
        queryClient.invalidateQueries({ queryKey: ["collection", collection.dTag] });
      }

      return !!event?.id;
    },
    [user, publish, queryClient]
  );

  return { updateCollection, isPending };
}

/**
 * Hook to delete a collection
 */
export function useDeleteCollection() {
  const { user } = useCurrentUser();
  const { mutateAsync: publish, isPending } = useNostrPublish();
  const queryClient = useQueryClient();

  const deleteCollection = useCallback(
    async (collection: Collection): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to delete collections");
      }

      if (collection.author.pubkey !== user.pubkey) {
        throw new Error("You can only delete your own collections");
      }

      // Publish a delete event (NIP-09)
      const eventData = {
        kind: 5,
        content: "Deleted",
        tags: [
          ["e", collection.id],
          ["a", `${LIST_KIND}:${collection.author.pubkey}:${collection.dTag}`],
        ],
      };

      const event = await publish(eventData);

      if (event) {
        queryClient.invalidateQueries({ queryKey: ["collections"] });
      }

      return !!event?.id;
    },
    [user, publish, queryClient]
  );

  return { deleteCollection, isPending };
}

/**
 * Hook to add a save to a collection
 */
export function useAddToCollection() {
  const { updateCollection, isPending } = useUpdateCollection();
  const { data: collections } = useCollections();

  const addToCollection = useCallback(
    async (collectionDTag: string, save: ParsedSave): Promise<boolean> => {
      const collection = collections?.find((c) => c.dTag === collectionDTag);
      if (!collection) {
        throw new Error("Collection not found");
      }

      return updateCollection(collection, { addSaves: [save] });
    },
    [collections, updateCollection]
  );

  return { addToCollection, isPending };
}

/**
 * Hook to remove a save from a collection
 */
export function useRemoveFromCollection() {
  const { updateCollection, isPending } = useUpdateCollection();
  const { data: collections } = useCollections();

  const removeFromCollection = useCallback(
    async (collectionDTag: string, saveDTag: string): Promise<boolean> => {
      const collection = collections?.find((c) => c.dTag === collectionDTag);
      if (!collection) {
        throw new Error("Collection not found");
      }

      return updateCollection(collection, { removeSaveIds: [saveDTag] });
    },
    [collections, updateCollection]
  );

  return { removeFromCollection, isPending };
}
