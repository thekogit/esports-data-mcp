import axios from 'axios';
import { fetchHtml, fetchJson, clearCache } from './fetcher';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('fetcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should fetch HTML content and cache it', async () => {
    mockedAxios.get.mockResolvedValue({ data: '<html>Example</html>' });

    const url = 'https://example.com/1';
    const firstCall = await fetchHtml(url);
    const secondCall = await fetchHtml(url);

    expect(firstCall).toBe('<html>Example</html>');
    expect(secondCall).toBe('<html>Example</html>');
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(url, expect.objectContaining({
      headers: expect.objectContaining({ 'Accept': 'text/html' })
    }));
  });

  it('should fetch JSON content and cache it', async () => {
    const jsonData = { key: 'value' };
    mockedAxios.get.mockResolvedValue({ data: jsonData });

    const url = 'https://example.com/json';
    const firstCall = await fetchJson(url);
    const secondCall = await fetchJson(url);

    expect(firstCall).toEqual(jsonData);
    expect(secondCall).toEqual(jsonData);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(mockedAxios.get).toHaveBeenCalledWith(url, expect.objectContaining({
      headers: expect.objectContaining({ 'Accept': 'application/json' })
    }));
  });

  it('should expire cache after 5 minutes', async () => {
    mockedAxios.get.mockResolvedValue({ data: '<html>Example</html>' });

    const url = 'https://example.com/2';
    await fetchHtml(url);
    
    // Advance time by 5 minutes + 1 second
    const fiveMinutesOneSecond = 5 * 60 * 1000 + 1000;
    jest.advanceTimersByTime(fiveMinutesOneSecond);
    jest.setSystemTime(new Date(Date.now() + fiveMinutesOneSecond));

    await fetchHtml(url);

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  it('should throw an error on 429 rate limit', async () => {
    mockedAxios.get.mockRejectedValue({
      response: { status: 429, data: 'Rate limit exceeded' }
    });

    const url = 'https://example.com/too-many-requests';
    await expect(fetchHtml(url)).rejects.toThrow('Rate limit exceeded (429)');
  });
});
