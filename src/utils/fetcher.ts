import axios from 'axios';

export async function fetchHtml(url: string): Promise<string> {
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  return data;
}
