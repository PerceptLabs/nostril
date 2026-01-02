/**
 * Metadata extraction utilities for URLs
 * Extracts Open Graph, Twitter Card, and standard meta tags
 */

export interface ExtractedMetadata {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  author?: string;
  publishedTime?: string;
  type?: string;
}

// CORS proxies to try (in order of preference)
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

/**
 * Fetch URL content through a CORS proxy
 */
async function fetchWithProxy(url: string, signal?: AbortSignal): Promise<string | null> {
  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(proxy + encodeURIComponent(url), {
        signal,
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
        },
      });

      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn(`Proxy ${proxy} failed:`, error);
      continue;
    }
  }
  return null;
}

/**
 * Parse HTML and extract metadata
 */
function parseMetadata(html: string, baseUrl: string): ExtractedMetadata {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const getMetaContent = (selectors: string[]): string | undefined => {
    for (const selector of selectors) {
      const el = doc.querySelector(selector);
      if (el) {
        const content = el.getAttribute('content') || el.getAttribute('value');
        if (content) return content;
      }
    }
    return undefined;
  };

  const getAbsoluteUrl = (url: string | undefined | null): string | undefined => {
    if (!url) return undefined;
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  };

  // Extract title - priority: og:title > twitter:title > title tag
  const title = getMetaContent([
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'meta[name="title"]',
  ]) || doc.querySelector('title')?.textContent?.trim();

  // Extract description
  const description = getMetaContent([
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
    'meta[name="description"]',
  ]);

  // Extract image
  const image = getAbsoluteUrl(getMetaContent([
    'meta[property="og:image"]',
    'meta[property="og:image:url"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:src"]',
  ]));

  // Extract favicon
  const faviconEl = doc.querySelector('link[rel="icon"]') ||
                    doc.querySelector('link[rel="shortcut icon"]') ||
                    doc.querySelector('link[rel="apple-touch-icon"]');
  const favicon = getAbsoluteUrl(faviconEl?.getAttribute('href')) ||
                  getAbsoluteUrl('/favicon.ico');

  // Extract site name
  const siteName = getMetaContent([
    'meta[property="og:site_name"]',
    'meta[name="application-name"]',
  ]) || new URL(baseUrl).hostname;

  // Extract author
  const author = getMetaContent([
    'meta[name="author"]',
    'meta[property="article:author"]',
  ]);

  // Extract published time
  const publishedTime = getMetaContent([
    'meta[property="article:published_time"]',
    'meta[name="date"]',
    'meta[name="pubdate"]',
  ]);

  // Extract type
  const type = getMetaContent([
    'meta[property="og:type"]',
  ]) || 'website';

  return {
    title,
    description,
    image,
    favicon,
    siteName,
    author,
    publishedTime,
    type,
  };
}

/**
 * Extract metadata from a URL
 */
export async function extractMetadata(
  url: string,
  options?: { timeout?: number; signal?: AbortSignal }
): Promise<ExtractedMetadata> {
  const timeout = options?.timeout ?? 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const signal = options?.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;

  try {
    const html = await fetchWithProxy(url, signal);
    clearTimeout(timeoutId);

    if (html) {
      return parseMetadata(html, url);
    }

    // Fallback: return basic URL-based metadata
    const hostname = new URL(url).hostname;
    return {
      title: hostname,
      description: `Saved from ${hostname}`,
      siteName: hostname,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Return basic fallback
    try {
      const hostname = new URL(url).hostname;
      return {
        title: hostname,
        description: `Saved from ${hostname}`,
        siteName: hostname,
      };
    } catch {
      return {
        title: 'Untitled',
        description: undefined,
      };
    }
  }
}

/**
 * Detect content type from URL
 */
export function detectContentType(url: string): 'link' | 'image' | 'pdf' | 'note' {
  const lowercaseUrl = url.toLowerCase();

  // Image extensions
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|$)/i.test(lowercaseUrl)) {
    return 'image';
  }

  // PDF
  if (/\.pdf(\?|$)/i.test(lowercaseUrl)) {
    return 'pdf';
  }

  // Default to link
  return 'link';
}

/**
 * Extract readable content from HTML (simplified)
 */
export function extractReadableContent(html: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove script, style, nav, footer, header, aside elements
  const removeSelectors = [
    'script', 'style', 'nav', 'footer', 'header', 'aside',
    '.sidebar', '.comments', '.advertisement', '.ad', '.ads',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  ];

  removeSelectors.forEach(selector => {
    doc.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Try to find main content
  const contentSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.content',
    '#content',
  ];

  for (const selector of contentSelectors) {
    const el = doc.querySelector(selector);
    if (el && el.textContent && el.textContent.length > 200) {
      return el.innerHTML;
    }
  }

  // Fallback to body
  return doc.body?.innerHTML || null;
}
