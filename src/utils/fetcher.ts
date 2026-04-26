import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

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

export async function fetchWithPuppeteer(url: string): Promise<string> {
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const html = await page.content();
    return html;
  } catch (error) {
    console.error(`Error fetching URL with Puppeteer (${url}):`, error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function fetchWithCache(url: string, isJson: boolean): Promise<any> {
  const now = Date.now();
  const cached = cache.get(url);

  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  try {
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': isJson ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (cache.size >= MAX_CACHE_SIZE) {
      cache.clear();
    }

    cache.set(url, { data, timestamp: now });
    return data;
  } catch (error: any) {
    if (error.response && error.response.status === 403 && !isJson) {
      console.warn(`Access Forbidden (403) for ${url}. Attempting fallback to Puppeteer.`);
      try {
        const data = await fetchWithPuppeteer(url);
        if (cache.size >= MAX_CACHE_SIZE) {
          cache.clear();
        }
        cache.set(url, { data, timestamp: now });
        return data;
      } catch (puppeteerError) {
        throw new Error(`Puppeteer fallback failed after 403: ${puppeteerError}`);
      }
    }

    if (error.response) {
      if (error.response.status === 429) {
        throw new Error('Rate limit exceeded (429). Please wait a few minutes.');
      }
      throw new Error(`Request failed with status ${error.response.status}: ${error.response.statusText}`);
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
