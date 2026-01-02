import { useCallback } from "react";
import { useNostr } from "@nostrify/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";
import { useNostrPublish } from "./useNostrPublish";
import { parseAnnotationEvent, type ParsedAnnotation } from "@/lib/nostril";
import { nanoid } from "nanoid";

const ANNOTATION_KIND = 30079;

/**
 * Hook to get annotations for a specific save
 */
export function useAnnotations(saveId: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["annotations", saveId],
    queryFn: async (c) => {
      if (!saveId) return [];
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      const events = await nostr.query(
        [{ kinds: [ANNOTATION_KIND], "#e": [saveId] }],
        { signal }
      );

      return events
        .map(parseAnnotationEvent)
        .filter((a): a is ParsedAnnotation => a !== null)
        .sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
    },
    enabled: !!saveId,
    staleTime: 30000,
  });
}

/**
 * Hook to get all annotations by the current user
 */
export function useMyAnnotations() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ["my-annotations", user?.pubkey],
    queryFn: async (c) => {
      if (!user) return [];
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      const events = await nostr.query(
        [{ kinds: [ANNOTATION_KIND], authors: [user.pubkey], limit: 100 }],
        { signal }
      );

      return events
        .map(parseAnnotationEvent)
        .filter((a): a is ParsedAnnotation => a !== null)
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    },
    enabled: !!user,
    staleTime: 30000,
  });
}

/**
 * Hook to create a new annotation
 */
export function useCreateAnnotation() {
  const { user } = useCurrentUser();
  const { mutateAsync: publish, isPending } = useNostrPublish();
  const queryClient = useQueryClient();

  const createAnnotation = useCallback(
    async (data: {
      saveId: string;
      saveDTag: string;
      content: string;
      context?: string;
      range?: string;
      rect?: string;
    }): Promise<string | null> => {
      if (!user) {
        throw new Error("Must be logged in to create annotations");
      }

      const dTag = nanoid(10);
      const tags: string[][] = [
        ["d", dTag],
        ["e", data.saveId],
        ["a", `30078:${user.pubkey}:${data.saveDTag}`],
      ];

      if (data.context) {
        tags.push(["context", data.context]);
      }
      if (data.range) {
        tags.push(["range", data.range]);
      }
      if (data.rect) {
        tags.push(["rect", data.rect]);
      }

      const eventData = {
        kind: ANNOTATION_KIND,
        content: data.content,
        tags,
      };

      const event = await publish(eventData);

      if (event) {
        queryClient.invalidateQueries({ queryKey: ["annotations", data.saveId] });
        queryClient.invalidateQueries({ queryKey: ["my-annotations"] });
      }

      return event?.id || null;
    },
    [user, publish, queryClient]
  );

  return { createAnnotation, isPending };
}

/**
 * Hook to update an annotation
 */
export function useUpdateAnnotation() {
  const { user } = useCurrentUser();
  const { mutateAsync: publish, isPending } = useNostrPublish();
  const queryClient = useQueryClient();

  const updateAnnotation = useCallback(
    async (
      annotation: ParsedAnnotation,
      updates: {
        content?: string;
        context?: string;
      }
    ): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to update annotations");
      }

      if (annotation.author.pubkey !== user.pubkey) {
        throw new Error("You can only update your own annotations");
      }

      const tags: string[][] = [
        ["d", annotation.dTag],
        ["e", annotation.saveId],
      ];

      if (updates.context ?? annotation.context) {
        tags.push(["context", updates.context ?? annotation.context!]);
      }
      if (annotation.range) {
        tags.push(["range", annotation.range]);
      }
      if (annotation.rect) {
        tags.push(["rect", annotation.rect]);
      }

      const eventData = {
        kind: ANNOTATION_KIND,
        content: updates.content ?? annotation.content,
        tags,
      };

      const event = await publish(eventData);

      if (event) {
        queryClient.invalidateQueries({ queryKey: ["annotations", annotation.saveId] });
        queryClient.invalidateQueries({ queryKey: ["my-annotations"] });
      }

      return !!event?.id;
    },
    [user, publish, queryClient]
  );

  return { updateAnnotation, isPending };
}

/**
 * Hook to delete an annotation
 */
export function useDeleteAnnotation() {
  const { user } = useCurrentUser();
  const { mutateAsync: publish, isPending } = useNostrPublish();
  const queryClient = useQueryClient();

  const deleteAnnotation = useCallback(
    async (annotation: ParsedAnnotation): Promise<boolean> => {
      if (!user) {
        throw new Error("Must be logged in to delete annotations");
      }

      if (annotation.author.pubkey !== user.pubkey) {
        throw new Error("You can only delete your own annotations");
      }

      // Publish a delete event (NIP-09)
      const eventData = {
        kind: 5,
        content: "Deleted",
        tags: [
          ["e", annotation.id],
          ["a", `${ANNOTATION_KIND}:${annotation.author.pubkey}:${annotation.dTag}`],
        ],
      };

      const event = await publish(eventData);

      if (event) {
        queryClient.invalidateQueries({ queryKey: ["annotations", annotation.saveId] });
        queryClient.invalidateQueries({ queryKey: ["my-annotations"] });
      }

      return !!event?.id;
    },
    [user, publish, queryClient]
  );

  return { deleteAnnotation, isPending };
}

/**
 * Hook to get annotation count for a save
 */
export function useAnnotationCount(saveId: string | undefined) {
  const { data: annotations } = useAnnotations(saveId);
  return annotations?.length || 0;
}

/**
 * Hook to get annotation counts for multiple saves
 */
export function useAnnotationCounts(saveIds: string[]) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ["annotation-counts", saveIds],
    queryFn: async (c) => {
      if (saveIds.length === 0) return new Map<string, number>();

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);
      const counts = new Map<string, number>();

      const events = await nostr.query(
        [{ kinds: [ANNOTATION_KIND], "#e": saveIds }],
        { signal }
      );

      events.forEach((event) => {
        const saveId = event.tags.find((t) => t[0] === "e")?.[1];
        if (saveId && saveIds.includes(saveId)) {
          counts.set(saveId, (counts.get(saveId) || 0) + 1);
        }
      });

      return counts;
    },
    enabled: saveIds.length > 0,
    staleTime: 60000,
  });
}
