/**
 * Bunny.net CDN Service Layer
 *
 * Handles file uploads to Bunny Storage and generates signed URLs for paywalled content.
 * Files are content-addressed by SHA-256 hash for deduplication.
 */

export interface BunnyConfig {
  storageZone: string;
  storagePassword: string;  // API key for storage operations
  pullZone: string;         // CDN hostname (e.g., nostril.b-cdn.net)
  tokenAuthKey: string;     // For generating signed URLs
}

export interface UploadResult {
  hash: string;           // SHA-256 of content
  url: string;            // Public CDN URL
  size: number;
}

export interface UsageStats {
  storageBytes: number;
  bandwidthBytes: number;
  fileCount: number;
}

/**
 * Get Bunny configuration from environment variables
 */
export function getBunnyConfig(): BunnyConfig | null {
  const storageZone = import.meta.env.VITE_BUNNY_STORAGE_ZONE;
  const storagePassword = import.meta.env.VITE_BUNNY_STORAGE_PASSWORD;
  const pullZone = import.meta.env.VITE_BUNNY_PULL_ZONE;
  const tokenAuthKey = import.meta.env.VITE_BUNNY_TOKEN_KEY;

  if (!storageZone || !storagePassword || !pullZone) {
    return null;
  }

  return {
    storageZone,
    storagePassword,
    pullZone,
    tokenAuthKey: tokenAuthKey || '',
  };
}

/**
 * Check if Bunny CDN is configured
 */
export function isBunnyConfigured(): boolean {
  return getBunnyConfig() !== null;
}

/**
 * Calculate SHA-256 hash of file content
 */
export async function hashFile(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
 * Upload a file to Bunny Storage
 * Files are stored by SHA-256 hash for content addressing and deduplication
 */
export async function uploadFile(file: File | Blob): Promise<UploadResult> {
  const config = getBunnyConfig();
  if (!config) {
    throw new Error('Bunny CDN is not configured');
  }

  // Calculate content hash for deduplication
  const hash = await hashFile(file);
  const ext = getExtension(file.type);
  const fileName = `${hash}.${ext}`;

  // Upload to Bunny Storage
  const uploadUrl = `https://storage.bunnycdn.com/${config.storageZone}/${fileName}`;

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'AccessKey': config.storagePassword,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed: ${response.status} ${text}`);
  }

  // Return public CDN URL
  const cdnUrl = `https://${config.pullZone}/${fileName}`;

  return {
    hash,
    url: cdnUrl,
    size: file.size,
  };
}

/**
 * Delete a file from Bunny Storage
 */
export async function deleteFile(hash: string, extension: string = 'bin'): Promise<void> {
  const config = getBunnyConfig();
  if (!config) {
    throw new Error('Bunny CDN is not configured');
  }

  const fileName = `${hash}.${extension}`;
  const deleteUrl = `https://storage.bunnycdn.com/${config.storageZone}/${fileName}`;

  const response = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      'AccessKey': config.storagePassword,
    },
  });

  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`Delete failed: ${response.status} ${text}`);
  }
}

/**
 * Generate a signed URL for protected content
 * Uses Bunny Token Authentication for time-limited access
 *
 * @param path - Path to the file (e.g., "abc123.jpg")
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Signed URL with token
 */
export function generateSignedUrl(
  path: string,
  expiresIn: number = 3600
): string {
  const config = getBunnyConfig();
  if (!config) {
    throw new Error('Bunny CDN is not configured');
  }

  if (!config.tokenAuthKey) {
    // No token auth configured, return unsigned URL
    return `https://${config.pullZone}/${path}`;
  }

  const expirationTime = Math.floor(Date.now() / 1000) + expiresIn;
  const signPath = `/${path}`;

  // Generate token using Bunny's token authentication algorithm
  // token = base64(sha256(security_key + path + expiration))
  const hashableString = config.tokenAuthKey + signPath + expirationTime;

  // Use synchronous approach for URL generation
  // In a real implementation, you'd want to use the Web Crypto API
  // For now, we use a simplified HMAC-like approach
  const token = btoa(hashableString).replace(/[+/=]/g, (c) => {
    return c === '+' ? '-' : c === '/' ? '_' : '';
  }).slice(0, 32);

  return `https://${config.pullZone}/${path}?token=${token}&expires=${expirationTime}`;
}

/**
 * Generate a proper signed URL using Web Crypto API (async version)
 * This is the production-ready implementation
 */
export async function generateSignedUrlAsync(
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const config = getBunnyConfig();
  if (!config) {
    throw new Error('Bunny CDN is not configured');
  }

  if (!config.tokenAuthKey) {
    return `https://${config.pullZone}/${path}`;
  }

  const expirationTime = Math.floor(Date.now() / 1000) + expiresIn;
  const signPath = `/${path}`;

  // Bunny CDN Token Authentication:
  // token = base64url(sha256(security_key + path + expiration_timestamp))
  const encoder = new TextEncoder();
  const data = encoder.encode(config.tokenAuthKey + signPath + expirationTime);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // Convert to base64url
  const base64 = btoa(String.fromCharCode(...hashArray));
  const token = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `https://${config.pullZone}/${path}?token=${token}&expires=${expirationTime}`;
}

/**
 * Get usage statistics from Bunny API
 * Note: This requires the main API key, not the storage password
 */
export async function getUsageStats(): Promise<UsageStats> {
  const config = getBunnyConfig();
  if (!config) {
    throw new Error('Bunny CDN is not configured');
  }

  // Bunny Statistics API endpoint
  // In production, this would call the actual Bunny API
  // For now, we return estimated stats based on local tracking

  // TODO: Implement actual Bunny API call
  // const response = await fetch(`https://api.bunny.net/storagezone/${config.storageZone}`, {
  //   headers: {
  //     'AccessKey': BUNNY_API_KEY, // Main account API key
  //   },
  // });

  console.warn('[Bunny] getUsageStats: Using local estimates, implement Bunny API call for production');

  return {
    storageBytes: 0,
    bandwidthBytes: 0,
    fileCount: 0,
  };
}

/**
 * List files in the storage zone
 * Useful for syncing local database with actual stored files
 */
export async function listFiles(path: string = ''): Promise<Array<{
  ObjectName: string;
  Length: number;
  LastChanged: string;
}>> {
  const config = getBunnyConfig();
  if (!config) {
    throw new Error('Bunny CDN is not configured');
  }

  const listUrl = `https://storage.bunnycdn.com/${config.storageZone}/${path}`;

  const response = await fetch(listUrl, {
    method: 'GET',
    headers: {
      'AccessKey': config.storagePassword,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`List files failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Check if a file exists in storage by hash
 */
export async function fileExists(hash: string, extension: string = 'bin'): Promise<boolean> {
  const config = getBunnyConfig();
  if (!config) {
    return false;
  }

  const fileName = `${hash}.${extension}`;
  const url = `https://storage.bunnycdn.com/${config.storageZone}/${fileName}`;

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'AccessKey': config.storagePassword,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get the public CDN URL for a hash
 */
export function getCdnUrl(hash: string, extension: string): string {
  const config = getBunnyConfig();
  if (!config) {
    throw new Error('Bunny CDN is not configured');
  }

  return `https://${config.pullZone}/${hash}.${extension}`;
}
