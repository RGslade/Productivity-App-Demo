import databaseService from '@/services/databaseService';
import { Document } from '@/types/document';
import { getStaticCached, invalidateStaticCache } from '@/services/staticCache';

class WebDocumentService {
  async getDocuments(): Promise<Document[]> {
    return getStaticCached('documents', async () => {
      const { data, error } = await databaseService.getAllGlobal<Document>('Documents', 'created_at');
      if (error) throw new Error(error.message);
      return (data || []).map((document) => ({ ...document, is_builtin: false }));
    });
  }

  async getDocument(id: number): Promise<Document | undefined> {
    if (id === 0) return;
    const { data, error } = await databaseService.getSingleGlobal<Document>('Documents', 'id', id);
    if (error) throw new Error(error.message);
    return data ? { ...data, is_builtin: false } : undefined;
  }

  async createDocumentFile(item: Document): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    const blob = new Blob([item.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = item.file_name;
    anchor.click();
    URL.revokeObjectURL(url);
    return item.file_name;
  }

  async downloadDocument(id: number): Promise<void> {
    const item = await this.getDocument(id);
    if (!item) throw new Error('Document not found');
    await this.createDocumentFile(item);
  }

  async uploadDocument(file: { title: string; name: string; description?: string; content?: string }): Promise<Document> {
    const { data, error } = await databaseService.insertToTableGlobal('Documents', {
      title: file.title,
      file_name: file.name,
      description: file.description,
      content: file.content,
    });
    if (error) throw new Error(error.message);
    await invalidateStaticCache('documents');
    return data;
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return ({ pdf: 'ðŸ“„', doc: 'ðŸ“', docx: 'ðŸ“', txt: 'ðŸ“„', xls: 'ðŸ“Š', xlsx: 'ðŸ“Š', jpg: 'ðŸ–¼', jpeg: 'ðŸ–¼', png: 'ðŸ–¼' } as Record<string, string>)[extension || ''] || 'ðŸ“„';
  }

  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || 'txt';
  }
}

export const documentService = new WebDocumentService();
export default documentService;
