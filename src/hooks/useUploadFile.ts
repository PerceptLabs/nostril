import { useMutation } from "@tanstack/react-query";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';

import { useCurrentUser } from "./useCurrentUser";
import { db, type CdnFile } from "@/lib/storage";
import {
  uploadFile as bunnyUpload,
  hashFile,
  isBunnyConfigured,
  getCdnUrl,
} from "@/services/bunny";
import { recordUpload, canUpload } from "@/lib/billing";

interface UploadResult {
  url: string;
  hash: string;
  size: number;
  mimeType: string;
  tags: string[][];
}

/**
 * Get file extension from MIME type
 */
function getExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'application/pdf': 'pdf',
  };
  return extensions[mimeType] || 'bin';
}

/**
 * Hook for uploading files with automatic routing to Bunny CDN or Blossom
 *
 * Priority:
 * 1. If Bunny CDN is configured, use it (with content addressing and deduplication)
 * 2. Fall back to Blossom servers
 *
 * Features:
 * - Content-addressed uploads (SHA-256 hash as filename)
 * - Automatic deduplication (checks if file already exists)
 * - Usage tracking for billing
 * - Plan limit enforcement
 */
export function useUploadFile() {
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async (file: File): Promise<UploadResult> => {
      if (!user) {
        throw new Error('Must be logged in to upload files');
      }

      // Check if Bunny CDN is configured
      if (isBunnyConfigured()) {
        return uploadToBunny(file);
      }

      // Fall back to Blossom
      return uploadToBlossom(file, user);
    },
  });
}

/**
 * Upload file to Bunny CDN with content addressing and deduplication
 */
async function uploadToBunny(file: File): Promise<UploadResult> {
  // Check plan limits before uploading
  const { allowed, reason } = await canUpload(file.size);
  if (!allowed) {
    throw new Error(reason || 'Upload not allowed');
  }

  // Calculate hash for content addressing
  const hash = await hashFile(file);
  const ext = getExtension(file.type);

  // Check if file already exists (deduplication)
  const existingFile = await db.cdnFiles.get(hash);
  if (existingFile) {
    // File already uploaded, return existing URL
    return {
      url: existingFile.url,
      hash: existingFile.hash,
      size: existingFile.size,
      mimeType: existingFile.mimeType,
      tags: [
        ['url', existingFile.url],
        ['x', existingFile.hash],
        ['size', String(existingFile.size)],
        ['m', existingFile.mimeType],
      ],
    };
  }

  // Upload to Bunny CDN
  const result = await bunnyUpload(file);

  // Store CDN file record
  const cdnFile: CdnFile = {
    hash: result.hash,
    url: result.url,
    size: result.size,
    mimeType: file.type || 'application/octet-stream',
    uploadedAt: Date.now(),
    referencedBy: [],
  };
  await db.cdnFiles.put(cdnFile);

  // Record usage for billing
  await recordUpload(result.size);

  return {
    url: result.url,
    hash: result.hash,
    size: result.size,
    mimeType: file.type || 'application/octet-stream',
    tags: [
      ['url', result.url],
      ['x', result.hash],
      ['size', String(result.size)],
      ['m', file.type || 'application/octet-stream'],
    ],
  };
}

/**
 * Upload file to Blossom servers (fallback)
 */
async function uploadToBlossom(
  file: File,
  user: { signer: any }
): Promise<UploadResult> {
  const uploader = new BlossomUploader({
    servers: [
      'https://blossom.primal.net/',
    ],
    signer: user.signer,
  });

  const tags = await uploader.upload(file);

  // Extract URL from tags
  const urlTag = tags.find(t => t[0] === 'url');
  const hashTag = tags.find(t => t[0] === 'x');
  const sizeTag = tags.find(t => t[0] === 'size');
  const mimeTag = tags.find(t => t[0] === 'm');

  return {
    url: urlTag?.[1] || '',
    hash: hashTag?.[1] || '',
    size: sizeTag ? parseInt(sizeTag[1], 10) : file.size,
    mimeType: mimeTag?.[1] || file.type,
    tags,
  };
}

/**
 * Hook for uploading multiple files in parallel
 */
export function useUploadFiles() {
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async (files: File[]): Promise<UploadResult[]> => {
      if (!user) {
        throw new Error('Must be logged in to upload files');
      }

      const results = await Promise.all(
        files.map(async (file) => {
          if (isBunnyConfigured()) {
            return uploadToBunny(file);
          }
          return uploadToBlossom(file, user);
        })
      );

      return results;
    },
  });
}

/**
 * Add a reference to a CDN file (track which articles/boards use it)
 */
export async function addFileReference(
  hash: string,
  referenceId: string
): Promise<void> {
  const file = await db.cdnFiles.get(hash);
  if (file && !file.referencedBy.includes(referenceId)) {
    file.referencedBy.push(referenceId);
    await db.cdnFiles.put(file);
  }
}

/**
 * Remove a reference from a CDN file
 */
export async function removeFileReference(
  hash: string,
  referenceId: string
): Promise<void> {
  const file = await db.cdnFiles.get(hash);
  if (file) {
    file.referencedBy = file.referencedBy.filter(id => id !== referenceId);
    await db.cdnFiles.put(file);
  }
}

/**
 * Get all CDN files
 */
export async function getCdnFiles(): Promise<CdnFile[]> {
  return db.cdnFiles.toArray();
}

/**
 * Get total storage used
 */
export async function getTotalStorageUsed(): Promise<number> {
  const files = await db.cdnFiles.toArray();
  return files.reduce((sum, file) => sum + file.size, 0);
}
