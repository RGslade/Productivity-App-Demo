import databaseService from '@/services/databaseService';
import { Document } from '@/types/document';
import * as FileSystem from 'expo-file-system';
import { getStaticCached, invalidateStaticCache } from '@/services/staticCache';

class DocumentService {
  /** Fetches every document from the shared database table. */
  async getDocuments(): Promise<Document[]> {
    return getStaticCached('documents', async () => {
      const { data, error } = await databaseService.getAllGlobal<Document>('Documents', 'created_at');
      if (error) throw new Error(error.message);
      return (data || []).map(document => ({ ...document, is_builtin: false }));
    });
  }

  /** Fetches one document by id from the shared database table. */
  async getDocument(id: number): Promise<Document | undefined> {
    if (id === 0) return;

    const { data, error } = await databaseService.getSingleGlobal<Document>('Documents', 'id', id);
    if (error) {
      console.error('documentService.getDocument', error);
      if (error.code === 'PGRST116' && error.details.includes(' 0 rows')) {
        throw new Error(error.message);
      }
    }

    return data ? { ...data, is_builtin: false } : undefined;
  }

  /** Creates a plain-text file for a document in a user-selected directory. */
  async createDocumentFile(document: Document): Promise<string | null> {
    if (!document) throw new Error('Document not found');
    const storageAccessFramework = (FileSystem as any).StorageAccessFramework;
    if (!storageAccessFramework) {
      console.warn('StorageAccessFramework unavailable on this platform');
      return null;
    }

    const permissions = await storageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) return null;

    try {
      const fileUri = await storageAccessFramework.createFileAsync(
        permissions.directoryUri,
        document.file_name,
        'text/plain'
      );
      await FileSystem.writeAsStringAsync(fileUri, document.content || '', { encoding: 'utf8' });
      return fileUri;
    } catch (error) {
      console.error('Error saving file:', error);
      return null;
    }
  }

  /** Downloads a document by writing it into user-selected storage. */
  async downloadDocument(id: number): Promise<void> {
    const document = await this.getDocument(id);
    if (!document) throw new Error('Document not found');

    const storageAccessFramework = (FileSystem as any).StorageAccessFramework;
    if (!storageAccessFramework) {
      console.warn('StorageAccessFramework unavailable on this platform');
      return;
    }

    const permissions = await storageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) {
      alert('Permission to access storage was denied');
      return;
    }

    await this.createDocumentFile(document);

    // try {
    //   const asset = await MediaLibrary.createAssetAsync(fileUri || '');
    //   const album = await MediaLibrary.getAlbumAsync('Download');
    //   if (album) {
    //     await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    //   } else {
    //     await MediaLibrary.createAlbumAsync('Download', asset, false);
    //   }
    // } catch (error) {
    //   console.error('Error saving to Downloads:', error);
    // }
  }

  /** Inserts a new document row into the shared `Documents` table. */
  async uploadDocument(file: {
    title: string;
    name: string;
    description?: string;
    content?: string;
  }): Promise<Document> {
    const { data, error } = await databaseService.insertToTableGlobal('Documents', {
      title: file.title,
      file_name: file.name,
      description: file.description,
      content: file.content,
    });

    if (error) {
      throw new Error(error.message);
    }

    await invalidateStaticCache('documents');

    return data;
  }

  /** Returns a file-type icon based on extension. */
  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    const iconMap: Record<string, string> = {
      pdf: '\u{1F4C4}',
      doc: '\u{1F4DD}',
      docx: '\u{1F4DD}',
      txt: '\u{1F4C4}',
      xls: '\u{1F4CA}',
      xlsx: '\u{1F4CA}',
      ppt: '\u{1F4FD}',
      pptx: '\u{1F4FD}',
      jpg: '\u{1F5BC}',
      jpeg: '\u{1F5BC}',
      png: '\u{1F5BC}',
      gif: '\u{1F5BC}',
      mp4: '\u{1F3A5}',
      avi: '\u{1F3A5}',
      mov: '\u{1F3A5}',
      mp3: '\u{1F3B5}',
      wav: '\u{1F3B5}',
      zip: '\u{1F4E6}',
      rar: '\u{1F4E6}',
    };

    return iconMap[extension || ''] || '\u{1F4C4}';
  }

  /** Returns the lower-case file extension for display. */
  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || 'txt';
  }
}

export const documentService = new DocumentService();
export default documentService;
