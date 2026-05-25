export type NewsCategory = 'business' | 'strange' | 'politics' | 'uk';

export type NewsCategoryFilter = 'all' | NewsCategory;

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: 'Sky News';
  category: NewsCategory;
  description?: string;
  publishedAt?: string;
  imageUrl?: string;
}

export interface NewsCategoryBundle {
  category: NewsCategory;
  articles: NewsArticle[];
}

export interface NewsFetchResult {
  categories: NewsCategoryBundle[];
  isOffline: boolean;
  fetchedAt: number;
}
