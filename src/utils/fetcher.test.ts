import { fetchHtml } from './fetcher';

describe('fetcher', () => {
  it('should fetch HTML content', async () => {
    const html = await fetchHtml('https://example.com');
    expect(html).toContain('Example Domain');
  });
});
