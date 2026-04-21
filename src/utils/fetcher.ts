import axios from 'axios';

interface CacheEntry {
  data: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_SIZE = 1000;

export function clearCache() {
  cache.clear();
}

export async function fetchHtml(url: string): Promise<string> {
  const now = Date.now();
  const cached = cache.get(url);

  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (cache.size >= MAX_CACHE_SIZE) {
      // Very simple pruning: just clear it or remove first item
      // For now, let's just clear it to keep it simple as requested
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
