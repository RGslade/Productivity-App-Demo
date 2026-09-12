import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { NewsArticle, NewsCategory, NewsFetchResult } from '@/types/news';

const SKY_NEWS_FEEDS: Record<NewsCategory, string> = {
  business: 'https://feeds.skynews.com/feeds/rss/business.xml',
  strange: 'https://feeds.skynews.com/feeds/rss/strange.xml',
  politics: 'https://feeds.skynews.com/feeds/rss/politics.xml',
  uk: 'https://feeds.skynews.com/feeds/rss/uk.xml',
};

const FETCH_TIMEOUT_MS = 12000;
const FETCH_RETRY_COUNT = 2;

class NewsServiceError extends Error {
  code: string;

  status?: number;

  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'NewsServiceError';
    this.code = code;
    this.status = typeof details?.status === 'number' ? details.status : undefined;
    this.details = details;
  }
}

class NewsService {
  /** Loads Sky News categories using the correct transport for the active platform. */
  async getNews(): Promise<NewsFetchResult> {
    if (Platform.OS === 'web') {
      return this.fetchWebNews();
    }

    const netInfo = await NetInfo.fetch();
    const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
    if (isOffline) {
      throw new NewsServiceError('OFFLINE', 'No internet connection detected.');
    }

    const categories = await Promise.all(
      (Object.keys(SKY_NEWS_FEEDS) as NewsCategory[]).map(async (category) => ({
        category,
        articles: await this.fetchCategory(category),
      }))
    );
    const response = { categories, isOffline: false, fetchedAt: Date.now() };
    return response;
  }

  /** Loads Sky News through the app-owned web proxy to avoid browser RSS CORS failures. */
  private async fetchWebNews(): Promise<NewsFetchResult> {
    const response = await fetch('/api/news', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const bodySnippet = await this.readResponseSnippet(response);
      const error = new NewsServiceError(
        'NEWS_PROXY_UNAVAILABLE',
        `Failed to fetch proxied news (${response.status}).`,
        {
          status: response.status,
          bodySnippet,
        }
      );
      console.error('newsService.fetchWebNews.proxyFailure', error);
      throw error;
    }

    const data = await response.json() as NewsFetchResult;
    if (!Array.isArray(data?.categories)) {
      const error = new NewsServiceError('INVALID_NEWS_RESPONSE', 'The news proxy returned an invalid response.', {
        receivedKeys: data && typeof data === 'object' ? Object.keys(data as unknown as Record<string, unknown>) : [],
      });
      console.error('newsService.fetchWebNews.invalidResponse', error);
      throw error;
    }

    return data;
  }

  /** Reads a small response body excerpt for diagnostics without flooding the console. */
  private async readResponseSnippet(response: Response): Promise<string> {
    try {
      return (await response.text()).slice(0, 500);
    } catch (error) {
      console.error('newsService.readResponseSnippet', error);
      return '';
    }
  }

  /** Returns a limited set of headlines from one news category. */
  async getTopHeadlinesByCategory(category: NewsCategory, limit: number): Promise<NewsArticle[]> {
    const news = await this.getNews();
    const selectedCategory = news.categories.find(item => item.category === category);
    return (selectedCategory?.articles || []).slice(0, Math.max(limit, 0));
  }

  /** Fetches and parses one Sky News RSS category for native platforms. */
  private async fetchCategory(category: NewsCategory): Promise<NewsArticle[]> {
    const feedUrl = SKY_NEWS_FEEDS[category];

    let lastError: unknown;
    for (let attempt = 1; attempt <= FETCH_RETRY_COUNT + 1; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const response = await fetch(feedUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
            'Cache-Control': 'no-cache',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new NewsServiceError('UNREACHABLE', `Failed to fetch ${category} feed (${response.status}).`, {
            category,
            status: response.status,
          });
        }

        const xml = await response.text();
        if (!xml || !xml.trim()) {
          throw new NewsServiceError('EMPTY_RESPONSE', `Received empty response body for ${category} feed.`, {
            category,
          });
        }

        return this.parseFeed(xml, category);
      } catch (error) {
        lastError = error;
        if (attempt > FETCH_RETRY_COUNT) break;
        await this.wait(350 * attempt);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    console.error(`Failed to fetch ${category} feed after retries.`, lastError);
    throw lastError || new NewsServiceError('UNREACHABLE', `Failed to fetch ${category} feed.`, {
      category,
    });
  }

  /** Waits before retrying a transient RSS fetch failure. */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Converts RSS XML into app article records. */
  private parseFeed(xml: string, category: NewsCategory): NewsArticle[] {
    const itemBlocks = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) || [];

    return itemBlocks
      .map((item, index) => {
        const title = this.decodeXml(this.extractTag(item, 'title') || 'Untitled article');
        const url = this.decodeXml(this.extractTag(item, 'link') || '');
        if (!url) return null;

        const description = this.cleanText(this.decodeXml(this.extractTag(item, 'description') || ''));
        const imageUrl = this.extractImageUrl(item) || undefined;
        const publishedAt = this.decodeXml(this.extractTag(item, 'pubDate') || '');

        return {
          id: `${category}-${index}-${url}`,
          title: this.cleanText(title),
          url,
          source: 'Sky News',
          category,
          description,
          publishedAt,
          imageUrl,
        } as NewsArticle;
      })
      .filter((item): item is NewsArticle => Boolean(item));
  }

  /** Extracts one XML tag value from an RSS item block. */
  private extractTag(content: string, tag: string): string | null {
    const match = content.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    if (!match?.[1]) return null;
    return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  }

  /** Extracts a Sky News image URL from supported RSS media tags. */
  private extractImageUrl(item: string): string | null {
    const mediaContent = item.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*>/i);
    if (mediaContent?.[1]) return this.decodeXml(mediaContent[1]);
    const enclosure = item.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*>/i);
    if (enclosure?.[1]) return this.decodeXml(enclosure[1]);
    return null;
  }

  /** Removes inline markup and normalises whitespace. */
  private cleanText(value: string): string {
    return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }

  /** Decodes XML entities used by the RSS feed. */
  private decodeXml(value: string): string {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'");
  }
}

export const newsService = new NewsService();
export default newsService;
