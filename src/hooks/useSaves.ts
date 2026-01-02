import { useCallback, useMemo } from "react";
import { useNostr } from "@nostrify/react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";
import { useNostrPublish } from "./useNostrPublish";
import type { ParsedSave, SaveFilter, CaptureData, ContentType } from "@/lib/nostril";
import { parseSaveEvent, extractTagsFromContent, saveToTags } from "@/lib/nostril";

/**
 * Hook to query saves from Nostr
 */
export function useSaves(filter?: SaveFilter) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["saves", filter],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]);

      const kinds = [30078] as const;
      const filters: Parameters<typeof nostr.query>[0] = [{ kinds, limit: filter?.limit ?? 50 }];

      // Add tag filter
      if (filter?.tags && filter.tags.length > 0) {
        filters[0]["#t"] = filter.tags;
      }

      // Add content-type filter
      if (filter?.contentType) {
        filters[0]["#content-type"] = [filter.contentType];
      }

      // Add author filter
      if (filter?.author) {
        filters[0].authors = [filter.author];
      }

      // Add time range
      if (filter?.since) {
        filters[0].since = filter.since;
      }
      if (filter?.until) {
        filters[0].until = filter.until;
      }

      const events = await nostr.query(filters, { signal });

      // Parse and sort by date
      const saves: ParsedSave[] = events
        .map(parseSaveEvent)
        .filter((s): s is ParsedSave => s !== null)
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

      // Client-side search filter
      if (filter?.search) {
        const searchLower = filter.search.toLowerCase();
        return saves.filter(
          (s) =>
            s.title?.toLowerCase().includes(searchLower) ||
            s.description?.toLowerCase().includes(searchLower) ||
            s.content.toLowerCase().includes(searchLower) ||
            s.url?.toLowerCase().includes(searchLower) ||
            s.tags.some((t) => t.toLowerCase().includes(searchLower))
        );
      }

      return saves;
    },
    staleTime: 30000,
  });
}

/**
 * Hook to get a single save by ID
 */
export function useSave(id: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["save", id],
    queryFn: async (c) => {
      if (!id) return null;
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr.query([{ ids: [id], kinds: [30078] }], { signal });
      if (events.length === 0) return null;

      return parseSaveEvent(events[0]);
    },
    enabled: !!id,
  });
}

/**
 * Hook to get saves by d-tag
 */
export function useSaveByDTag(dTag: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["save-by-dtag", dTag],
    queryFn: async (c) => {
      if (!dTag) return null;
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr.query(
        [{ kinds: [30078], "#d": [dTag] }],
        { signal }
      );
      if (events.length === 0) return null;

      return parseSaveEvent(events[0]);
    },
    enabled: !!dTag,
  });
}

/**
 * Hook to get saves that reference a given d-tag (backlinks)
 */
export function useBacklinks(dTag: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["backlinks", dTag],
    queryFn: async (c) => {
      if (!dTag) return [];
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr.query(
        [{ kinds: [30078], "#ref": [dTag] }],
        { signal }
      );

      return events
        .map(parseSaveEvent)
        .filter((s): s is ParsedSave => s !== null)
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    },
    enabled: !!dTag,
  });
}

/**
 * Hook to publish a new save
 */
export function useCreateSave() {
  const { user } = useCurrentUser();
  const { mutateAsync: publish, isPending } = useNostrPublish();

  const createSave = useCallback(
    async (data: CaptureData): Promise<string | null> => {
      if (!user) {
        throw new Error("Must be logged in to create saves");
      }

      // Extract tags from content if not provided
      const tags = data.tags.length > 0
        ? data.tags
        : extractTagsFromContent(data.content);

      const eventData = {
        kind: 30078,
        content: data.content,
        tags: saveToTags({ ...data, tags }),
      };

      const event = await publish(eventData);
      return event?.id || null;
    },
    [user, publish]
  );

  return { createSave, isPending };
}

/**
 * Hook to update an existing save
 */
export function useUpdateSave() {
  const { user } = useCurrentUser();
  const { mutateAsync: publish, isPending } = useNostrPublish();

  const updateSave = useCallback(
    async (
      saveId: string,
      data: Partial<CaptureData>
    ): Promise<string | null> => {
      if (!user) {
        throw new Error("Must be logged in to update saves");
      }

      const eventData = {
        kind: 30078,
        content: data.content ?? "",
        tags: [
          ["d", saveId],
          ...(data.url ? [["r", data.url]] : []),
          ...(data.title ? [["title", data.title]] : []),
          ...(data.description ? [["description", data.description]] : []),
          ...(data.image ? [["image", data.image]] : []),
          ...(data.contentType ? [["content-type", data.contentType]] : []),
          ...(data.tags?.map((t) => ["t", t.toLowerCase()]) ?? []),
          ...(data.refs?.map((r) => ["ref", r]) ?? []),
        ],
      };

      const event = await publish(eventData);
      return event?.id || null;
    },
    [user, publish]
  );

  return { updateSave, isPending };
}

/**
 * Hook to get all unique tags
 */
export function useAllTags() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["all-tags"],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      const events = await nostr.query(
        [{ kinds: [30078], limit: 200 }],
        { signal }
      );

      const tagCounts = new Map<string, number>();

      events.forEach((event) => {
        event.tags
          .filter((t) => t[0] === "t")
          .forEach((t) => {
            const tag = t[1].toLowerCase();
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          });
      });

      return Array.from(tagCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    },
    staleTime: 60000,
  });
}

/**
 * Hook to search saves for wikilink autocomplete
 */
export function useWikilinkSearch(query: string) {
  const { data: saves, isLoading } = useSaves({ search: query, limit: 10 });

  const data = useMemo(() => {
    if (!query) return [];
    return (saves || []).map((s) => ({
      dTag: s.dTag,
      title: s.title || s.url || s.dTag,
      url: s.url,
    }));
  }, [saves, query]);

  return { data, isLoading };
}