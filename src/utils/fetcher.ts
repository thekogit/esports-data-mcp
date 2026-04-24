import axios from 'axios';
import * as cheerio from 'cheerio';

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_SIZE = 1000;

export function clearCache() {
  cache.clear();
}

async function fetchWithCache(url: string, isJson: boolean): Promise<any> {
  const now = Date.now();
  const cached = cache.get(url);

  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  try {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': isJson ? 'application/json' : 'text/html'
      }
    });

    if (cache.size >= MAX_CACHE_SIZE) {
      cache.clear();
    }

    cache.set(url, { data, timestamp: now });
    return data;
  } catch (error: any) {
    if (error.response && error.response.status === 429) {
      throw new Error('Rate limit exceeded (429)');
    }
    throw error;
  }
}

export async function fetchHtml(url: string): Promise<string> {
  return fetchWithCache(url, false);
}

export async function fetchJson<T = any>(url: string): Promise<T> {
  return fetchWithCache(url, true);
}

/**
 * Sanitizes HTML by removing scripts, styles, and ads, 
 * then returns a condensed text summary to reduce token noise.
 */
export async function fetchAndSummarize(url: string): Promise<string> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // Remove noisy elements
  $('script, style, iframe, nav, footer, ads, .ads, #ads, .footer, .header, .nav').remove();

  // Get text and collapse whitespace
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  
  // Return first 2000 chars - enough for context, short enough to save tokens
  return text.substring(0, 2000);
}
