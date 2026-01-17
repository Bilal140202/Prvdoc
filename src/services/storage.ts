// Privacy-first local storage service using IndexedDB
// ALL data stays on the user's device - ZERO external calls

import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { 
  Document, 
  DocumentChunk, 
  StoredDocument, 
  StoredChunk,
  ChatMessage,
  PrivacySettings 
} from '../types';

interface PrivacyThinkDB extends DBSchema {
  documents: {
    key: string;
    value: StoredDocument;
    indexes: { 'by-type': string; 'by-date': string };
  };
  chunks: {
    key: string;
    value: StoredChunk;
    indexes: { 'by-document': string };
  };
  chat_history: {
    key: string;
    value: ChatMessage;
    indexes: { 'by-timestamp': Date };
  };
  settings: {
    key: string;
    value: any;
  };
  models: {
    key: string;
    value: {
      name: string;
      data: ArrayBuffer;
      metadata: any;
    };
  };
}

export class PrivacyStorageService {
  private db: IDBPDatabase<PrivacyThinkDB> | null = null;
  private readonly DB_NAME = 'PrivacyThinkDB';
  private readonly DB_VERSION = 1;

  async initialize(): Promise<void> {
    try {
      this.db = await openDB<PrivacyThinkDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Documents store
          if (!db.objectStoreNames.contains('documents')) {
            const docStore = db.createObjectStore('documents', { keyPath: 'id' });
            docStore.createIndex('by-type', 'type');
            docStore.createIndex('by-date', 'uploadedAt');
          }

          // Chunks store with embeddings
          if (!db.objectStoreNames.contains('chunks')) {
            const chunkStore = db.createObjectStore('chunks', { keyPath: 'id' });
            chunkStore.createIndex('by-document', 'documentId');
          }

          // Chat history
          if (!db.objectStoreNames.contains('chat_history')) {
            const chatStore = db.createObjectStore('chat_history', { keyPath: 'id' });
            chatStore.createIndex('by-timestamp', 'timestamp');
          }

          // Settings and preferences
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }

          // Local model storage
          if (!db.objectStoreNames.contains('models')) {
            db.createObjectStore('models', { keyPath: 'name' });
          }
        }
      });

      console.log('✅ PrivacyThink storage initialized - All data stays local!');
    } catch (error) {
      console.error('❌ Failed to initialize local storage:', error);
      throw new Error('Could not initialize privacy-first storage');
    }
  }

  private ensureDB(): IDBPDatabase<PrivacyThinkDB> {
    if (!this.db) {
      throw new Error('Storage not initialized. Call initialize() first.');
    }
    return this.db;
  }

  // Document operations - ALL LOCAL
  async saveDocument(document: Document): Promise<void> {
    const db = this.ensureDB();
    
    const storedDoc: StoredDocument = {
      id: document.id,
      name: document.name,
      type: document.type,
      size: document.size,
      uploadedAt: document.uploadedAt.toISOString(),
      processedAt: document.processedAt?.toISOString(),
      content: document.content,
      chunks: document.chunks?.map(chunk => ({
        id: chunk.id,
        documentId: chunk.documentId,
        content: chunk.content,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex,
        page: chunk.page,
        embedding: chunk.embedding || [],
        metadata: chunk.metadata
      })) || []
    };

    const tx = db.transaction(['documents', 'chunks'], 'readwrite');
    
    // Save document
    await tx.objectStore('documents').put(storedDoc);
    
    // Save chunks with embeddings
    for (const chunk of storedDoc.chunks) {
      await tx.objectStore('chunks').put(chunk);
    }
    
    await tx.done;
    console.log(`📄 Document saved locally: ${document.name}`);
  }

  async getDocument(id: string): Promise<Document | null> {
    const db = this.ensureDB();
    const storedDoc = await db.get('documents', id);
    
    if (!storedDoc) return null;

    return {
      id: storedDoc.id,
      name: storedDoc.name,
      type: storedDoc.type,
      size: storedDoc.size,
      uploadedAt: new Date(storedDoc.uploadedAt),
      processedAt: storedDoc.processedAt ? new Date(storedDoc.processedAt) : undefined,
      content: storedDoc.content,
      chunks: storedDoc.chunks.map(chunk => ({
        id: chunk.id,
        documentId: chunk.documentId,
        content: chunk.content,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex,
        page: chunk.page,
        embedding: chunk.embedding,
        metadata: chunk.metadata
      }))
    };
  }

  async getAllDocuments(): Promise<Document[]> {
    const db = this.ensureDB();
    const storedDocs = await db.getAll('documents');
    
    return Promise.all(
      storedDocs.map(async (storedDoc) => {
        const doc = await this.getDocument(storedDoc.id);
        return doc!;
      })
    );
  }

  async deleteDocument(id: string): Promise<void> {
    const db = this.ensureDB();
    const tx = db.transaction(['documents', 'chunks'], 'readwrite');
    
    // Delete document
    await tx.objectStore('documents').delete(id);
    
    // Delete all chunks for this document
    const chunks = await tx.objectStore('chunks').index('by-document').getAll(id);
    for (const chunk of chunks) {
      await tx.objectStore('chunks').delete(chunk.id);
    }
    
    await tx.done;
    console.log(`🗑️  Document deleted locally: ${id}`);
  }

  // Vector search on local embeddings
  async searchChunks(queryEmbedding: number[], topK: number = 5, threshold: number = 0.7): Promise<DocumentChunk[]> {
    const db = this.ensureDB();
    const allChunks = await db.getAll('chunks');
    
    // Calculate cosine similarity locally
    const similarities = allChunks
      .filter(chunk => chunk.embedding && chunk.embedding.length > 0)
      .map(chunk => ({
        chunk: {
          id: chunk.id,
          documentId: chunk.documentId,
          content: chunk.content,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          page: chunk.page,
          embedding: chunk.embedding,
          metadata: chunk.metadata
        },
        similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding!)
      }))
      .filter(result => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return similarities.map(result => result.chunk);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Chat history - LOCAL ONLY
  async saveChatMessage(message: ChatMessage): Promise<void> {
    const db = this.ensureDB();
    await db.put('chat_history', message);
  }

  async getChatHistory(limit: number = 50): Promise<ChatMessage[]> {
    const db = this.ensureDB();
    const messages = await db.getAll('chat_history');
    return messages
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(-limit);
  }

  async clearChatHistory(): Promise<void> {
    const db = this.ensureDB();
    await db.clear('chat_history');
    console.log('🗑️  Chat history cleared locally');
  }

  // Settings - LOCAL ONLY
  async saveSettings(settings: PrivacySettings): Promise<void> {
    const db = this.ensureDB();
    await db.put('settings', { key: 'privacy_settings', ...settings });
    console.log('⚙️  Privacy settings saved locally');
  }

  async getSettings(): Promise<PrivacySettings> {
    const db = this.ensureDB();
    const settings = await db.get('settings', 'privacy_settings');
    
    // Default privacy-first settings
    return settings || {
      autoDeleteAfterDays: undefined,
      encryptStorage: false,
      enableAnalytics: false, // ALWAYS false for privacy
      maxDocuments: 100,
      maxTotalSize: 10 * 1024 * 1024 * 1024 // 10GB
    };
  }

  // Model storage - LOCAL ONLY
  async saveModel(name: string, data: ArrayBuffer, metadata: any): Promise<void> {
    const db = this.ensureDB();
    await db.put('models', { name, data, metadata });
    console.log(`🤖 Model saved locally: ${name}`);
  }

  async getModel(name: string): Promise<ArrayBuffer | null> {
    const db = this.ensureDB();
    const model = await db.get('models', name);
    return model?.data || null;
  }

  async deleteModel(name: string): Promise<void> {
    const db = this.ensureDB();
    await db.delete('models', name);
    console.log(`🗑️  Model deleted locally: ${name}`);
  }

  // Privacy operations
  async getStorageStats(): Promise<{ 
    documentsCount: number;
    chunksCount: number;
    totalSize: number;
    chatMessages: number;
  }> {
    const db = this.ensureDB();
    
    const [documents, chunks, messages] = await Promise.all([
      db.getAll('documents'),
      db.getAll('chunks'),
      db.getAll('chat_history')
    ]);

    const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);

    return {
      documentsCount: documents.length,
      chunksCount: chunks.length,
      totalSize,
      chatMessages: messages.length
    };
  }

  async deleteAllData(): Promise<void> {
    const db = this.ensureDB();
    const tx = db.transaction(['documents', 'chunks', 'chat_history'], 'readwrite');
    
    await tx.objectStore('documents').clear();
    await tx.objectStore('chunks').clear();
    await tx.objectStore('chat_history').clear();
    
    await tx.done;
    console.log('🗑️  ALL data deleted locally - Privacy guaranteed!');
  }

  // Export data for user control
  async exportAllData(): Promise<string> {
    const [documents, chatHistory, settings] = await Promise.all([
      this.getAllDocuments(),
      this.getChatHistory(),
      this.getSettings()
    ]);

    return JSON.stringify({
      documents,
      chatHistory,
      settings,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }
}

// Singleton instance
export const storageService = new PrivacyStorageService();