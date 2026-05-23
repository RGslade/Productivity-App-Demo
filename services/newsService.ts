import NetInfo from '@react-native-community/netinfo';
import { NewsArticle, NewsCategory, NewsFetchResult } from '@/types/news';

//
const SKY_NEWS_FEEDS: Record<NewsCategory, string> = {
  business: 'https://feeds.skynews.com/feeds/rss/business.xml',
  strange: 'https://feeds.skynews.com/feeds/rss/strange.xml',
  politics: 'https://feeds.skynews.com/feeds/rss/politics.xml',
  uk: 'https://feeds.skynews.com/feeds/rss/uk.xml',
};

//
const FETCH_TIMEOUT_MS = 12000;
//
const FETCH_RETRY_COUNT = 2;

//
class NewsService {
  async getNews(): Promise<NewsFetchResult> {
    //
    const netInfo = await NetInfo.fetch();
    //
    const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
    //
    if (isOffline) {
      console.error('No internet connection detected when attempting to fetch news.');
      throw {
        code: 'OFFLINE',
        message: 'No internet connection detected.',
      };
    }

    //
    const categories = await Promise.all(
      (Object.keys(SKY_NEWS_FEEDS) as NewsCategory[]).map(async (category) => ({
        category,
        articles: await this.fetchCategory(category),
      }))
    );
    //
    const response = { categories, isOffline: false, fetchedAt: Date.now() };
    return response;
  }

  async getTopHeadlinesByCategory(category: NewsCategory, limit: number): Promise<NewsArticle[]> {
    //
    const news = await this.getNews();
    //
    const selectedCategory = news.categories.find(item => item.category === category);
    //
    return (selectedCategory?.articles || []).slice(0, Math.max(limit, 0));
  }

  private async fetchCategory(category: NewsCategory): Promise<NewsArticle[]> {
    //
    const feedUrl = SKY_NEWS_FEEDS[category];

    //
    let lastError: unknown;
    for (let attempt = 1; attempt <= FETCH_RETRY_COUNT + 1; attempt += 1) {
      //
      const controller = new AbortController();
      //
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      //
      try {
        //
        const response = await fetch(feedUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
            'Cache-Control': 'no-cache',
          },
          signal: controller.signal,
        });

        //
        if (!response.ok) {
          throw {
            code: 'UNREACHABLE',
            message: `Failed to fetch ${category} feed (${response.status}).`,
          };
        }

        //
        const xml = await response.text();
        //
        if (!xml || !xml.trim()) {
          throw {
            code: 'EMPTY_RESPONSE',
            message: `Received empty response body for ${category} feed.`,
          };
        }

        return this.parseFeed(xml, category);
      } catch (error) {
        lastError = error;
        //
        if (attempt > FETCH_RETRY_COUNT) break;
        await this.wait(350 * attempt);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    console.error(`Failed to fetch ${category} feed after retries.`, lastError);
    throw lastError || {
      code: 'UNREACHABLE',
      message: `Failed to fetch ${category} feed.`,
    };
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private parseFeed(xml: string, category: NewsCategory): NewsArticle[] {
    //
    const itemBlocks = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) || [];

    return itemBlocks
      .map((item, index) => {
        //
        const title = this.decodeXml(this.extractTag(item, 'title') || 'Untitled article');
        //
        const url = this.decodeXml(this.extractTag(item, 'link') || '');
        //
        if (!url) return null;

        //
        const description = this.cleanText(this.decodeXml(this.extractTag(item, 'description') || ''));
        //
        const imageUrl = this.extractImageUrl(item) || undefined;
        //
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

  private extractTag(content: string, tag: string): string | null {
    //
    const match = content.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    //
    if (!match?.[1]) return null;
    return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  }

  private extractImageUrl(item: string): string | null {
    //
    const mediaContent = item.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*>/i);
    //
    if (mediaContent?.[1]) return this.decodeXml(mediaContent[1]);
    //
    const enclosure = item.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*>/i);
    //
    if (enclosure?.[1]) return this.decodeXml(enclosure[1]);
    return null;
  }

  private cleanText(value: string): string {
    return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }

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

//
export const newsService = new NewsService();
//
export default newsService;
