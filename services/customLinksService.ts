import databaseService from '@/services/databaseService';
import { HelpfulLink } from '@/types/links';

type CustomLinkRow = {
  id: number;
  title: string;
  description: string | null;
  url: string;
  category: string | null;
  created_at?: string;
  updated_at?: string;
};

type CreateCustomLinkRequest = {
  title: string;
  description: string;
  url: string;
  category: string;
};

export class CustomLinksUnavailableError extends Error {
  constructor() {
    super('Custom links are not set up yet.');
    this.name = 'CustomLinksUnavailableError';
  }
}

/** True when Supabase reports that the optional CustomLinks table has not been deployed. */
export function isCustomLinksUnavailableError(error: unknown): boolean {
  if (error instanceof CustomLinksUnavailableError) return true;
  if (!error || typeof error !== 'object') return false;

  const maybeError = error as { code?: string; message?: string };
  return maybeError.code === '42P01' ||
    maybeError.message?.includes('relation "public.CustomLinks" does not exist') === true ||
    maybeError.message?.includes('Custom links are not set up yet') === true;
}

/** Maps a database custom-link row into the links screen model. */
function mapCustomLink(row: CustomLinkRow): HelpfulLink {
  return {
    id: `custom-${row.id}`,
    title: row.title,
    description: row.description || 'Saved by you.',
    url: row.url,
    category: row.category || 'Custom',
    icon: 'custom',
    isExternal: true,
    priority: 9,
  };
}

class CustomLinksService {
  /** Gets saved custom links for the current user. */
  async getCustomLinks(): Promise<HelpfulLink[]> {
    try {
      const { data } = await databaseService.getAll<CustomLinkRow>('CustomLinks', 'updated_at', true);
      return data.map(mapCustomLink);
    } catch (error) {
      if (isCustomLinksUnavailableError(error)) {
        throw new CustomLinksUnavailableError();
      }
      throw error;
    }
  }

  /** Creates a custom link for the current user. */
  async createCustomLink(request: CreateCustomLinkRequest): Promise<HelpfulLink> {
    const { data, error } = await databaseService.insertAndSelect<CustomLinkRow>('CustomLinks', request);
    if (error) {
      if (isCustomLinksUnavailableError(error)) {
        throw new CustomLinksUnavailableError();
      }
      console.error('customLinksService.createCustomLink', error);
      throw error;
    }
    return mapCustomLink(data);
  }

  /** Updates a custom link belonging to the current user. */
  async updateCustomLink(id: string, request: CreateCustomLinkRequest): Promise<HelpfulLink> {
    const numericId = Number(id.replace('custom-', ''));
    if (!Number.isFinite(numericId)) throw new Error('Invalid custom link id');
    try {
      const { data, error } = await databaseService.updateTable<CustomLinkRow>(
        'CustomLinks',
        request,
        undefined,
        'id',
        numericId
      );
      if (error) {
        if (isCustomLinksUnavailableError(error)) {
          throw new CustomLinksUnavailableError();
        }
        throw error;
      }
      return mapCustomLink(data);
    } catch (error) {
      if (isCustomLinksUnavailableError(error)) {
        throw new CustomLinksUnavailableError();
      }
      throw error;
    }
  }

  /** Deletes a custom link for the current user. */
  async deleteCustomLink(id: string): Promise<void> {
    const numericId = Number(id.replace('custom-', ''));
    if (!Number.isFinite(numericId)) throw new Error('Invalid custom link id');
    try {
      await databaseService.deleteFromTable('CustomLinks', 'id', numericId);
    } catch (error) {
      if (isCustomLinksUnavailableError(error)) {
        throw new CustomLinksUnavailableError();
      }
      throw error;
    }
  }
}

export const customLinksService = new CustomLinksService();
export default customLinksService;
