// Privacy-first RAG service - Retrieval-Augmented Generation
// ALL operations happen locally: embedding, search, and generation

import { llmService } from './llm';
import { storageService } from './storage';
import { documentProcessor } from './documentProcessor';
import type { 
  Document, 
  ChatMessage, 
  DocumentSource, 
  SearchResult,
  ProcessingProgress 
} from '../types';

export class PrivacyRAGService {
  private progressCallback?: (progress: ProcessingProgress) => void;

  setProgressCallback(callback: (progress: ProcessingProgress) => void): void {
    this.progressCallback = callback;
    documentProcessor.setProgressCallback(callback);
  }

  private updateProgress(stage: any, progress: number, message: string): void {
    this.progressCallback?.({
      stage,
      progress: Math.min(100, Math.max(0, progress)),
      message
    });
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔒 Initializing PrivacyThink RAG system...');
      
      // Initialize storage first
      await storageService.initialize();
      
      // Check if model needs to be loaded
      if (!llmService.isModelLoaded() && !llmService.isModelLoading()) {
        this.updateProgress('downloading', 0, 'Loading AI model...');
        await llmService.initialize();
      }
      
      console.log('✅ PrivacyThink initialized - Ready for private document analysis!');
    } catch (error) {
      console.error('❌ Failed to initialize PrivacyThink:', error);
      throw error;
    }
  }

  // Process and index documents - ALL LOCAL
  async processDocument(file: File): Promise<Document> {
    try {
      this.updateProgress('uploading', 0, 'Starting document processing...');

      // Process document content
      const document = await documentProcessor.processDocument(file);
      
      this.updateProgress('embedding', 70, 'Generating embeddings...');
      
      // Generate embeddings for all chunks
      if (document.chunks && document.chunks.length > 0) {
        const totalChunks = document.chunks.length;
        let completedChunks = 0;
        
        // Parallel processing with concurrency limit to improve performance
        const CONCURRENCY_LIMIT = 5;
        // Create a copy of the array for the queue to avoid modifying the original document.chunks array in place while iterating?
        // Actually we want to modify the chunk objects inside the original array.
        // But we use a queue for processing.
        const queue = [...document.chunks];

        const processNext = async () => {
          while (queue.length > 0) {
            const chunk = queue.shift();
            if (!chunk) break;

            // Generate embedding for this chunk
            chunk.embedding = await llmService.generateEmbedding(chunk.content);
            completedChunks++;

            const progress = 70 + (completedChunks / totalChunks) * 20;
            this.updateProgress('embedding', progress,
              `Processing chunk ${completedChunks} of ${totalChunks}`);
          }
        };

        // Start workers
        const workers = Array(Math.min(CONCURRENCY_LIMIT, totalChunks))
          .fill(null)
          .map(() => processNext());
          
        await Promise.all(workers);
      }

      this.updateProgress('indexing', 95, 'Saving to local index...');
      
      // Save to local storage
      await storageService.saveDocument(document);
      
      this.updateProgress('complete', 100, 'Document ready for analysis!');
      
      return document;
      
    } catch (error) {
      this.updateProgress('error', 0, `Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // Search documents using vector similarity - ALL LOCAL
  async searchDocuments(
    query: string, 
    options: {
      topK?: number;
      threshold?: number;
      documentIds?: string[];
    } = {}
  ): Promise<SearchResult> {
    try {
      const { topK = 5, threshold = 0.7, documentIds } = options;
      
      // Generate embedding for query
      const queryEmbedding = await llmService.generateEmbedding(query);
      
      // Search local vector store
      let chunks = await storageService.searchChunks(queryEmbedding, topK * 2, threshold * 0.8);
      
      // Filter by document IDs if specified
      if (documentIds && documentIds.length > 0) {
        chunks = chunks.filter(chunk => documentIds.includes(chunk.documentId));
      }
      
      // Take top K results
      chunks = chunks.slice(0, topK);
      
      // Calculate statistics
      const relevanceScores = chunks.map(chunk => {
        if (!chunk.embedding) return 0;
        return this.calculateSimilarity(queryEmbedding, chunk.embedding);
      });
      
      const maxScore = Math.max(...relevanceScores, 0);
      const avgScore = relevanceScores.length > 0 
        ? relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length 
        : 0;
      
      return {
        chunks,
        totalResults: chunks.length,
        maxRelevanceScore: maxScore,
        averageRelevanceScore: avgScore
      };
      
    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error;
    }
  }

  // Generate response using retrieved context - ALL LOCAL
  async generateResponse(
    userQuestion: string,
    options: {
      maxSources?: number;
      temperature?: number;
      maxTokens?: number;
      documentIds?: string[];
    } = {}
  ): Promise<ChatMessage> {
    try {
      const { maxSources = 5, temperature = 0.7, maxTokens = 512 } = options;
      
      // Search for relevant context
      const searchResults = await this.searchDocuments(userQuestion, {
        topK: maxSources,
        threshold: 0.6,
        documentIds: options.documentIds
      });
      
      // Build context from retrieved chunks
      let context = '';
      const sources: DocumentSource[] = [];
      
      if (searchResults.chunks.length > 0) {
        // Get document names for sources
        const documentMap = new Map<string, string>();
        for (const chunk of searchResults.chunks) {
          if (!documentMap.has(chunk.documentId)) {
            const doc = await storageService.getDocument(chunk.documentId);
            if (doc) {
              documentMap.set(chunk.documentId, doc.name);
            }
          }
        }
        
        // Build context string and sources array
        for (let i = 0; i < searchResults.chunks.length; i++) {
          const chunk = searchResults.chunks[i];
          const docName = documentMap.get(chunk.documentId) || 'Unknown Document';
          
          context += `\nSource ${i + 1} (${docName}${chunk.page ? `, Page ${chunk.page}` : ''}):\n${chunk.content}\n`;
          
          sources.push({
            documentId: chunk.documentId,
            documentName: docName,
            chunkId: chunk.id,
            content: chunk.content.slice(0, 200) + (chunk.content.length > 200 ? '...' : ''),
            page: chunk.page,
            relevanceScore: chunk.embedding 
              ? this.calculateSimilarity(
                  await llmService.generateEmbedding(userQuestion), 
                  chunk.embedding
                )
              : 0
          });
        }
      }
      
      // Generate response using local LLM
      const responseText = await llmService.generateText(
        userQuestion, 
        context,
        { temperature, maxTokens }
      );
      
      // Create chat message
      const message: ChatMessage = {
        id: this.generateId(),
        content: responseText,
        role: 'assistant',
        timestamp: new Date(),
        sources: sources.length > 0 ? sources : undefined
      };
      
      // Save to chat history
      await storageService.saveChatMessage(message);
      
      return message;
      
    } catch (error) {
      console.error('❌ Failed to generate response:', error);
      
      const errorMessage: ChatMessage = {
        id: this.generateId(),
        content: `I apologize, but I encountered an error while processing your question: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        role: 'assistant',
        timestamp: new Date()
      };
      
      await storageService.saveChatMessage(errorMessage);
      return errorMessage;
    }
  }

  // Chat interface - maintains conversation context
  async chat(userMessage: string, options?: {
    documentIds?: string[];
    includeHistory?: boolean;
  }): Promise<ChatMessage> {
    try {
      // Save user message
      const userChatMessage: ChatMessage = {
        id: this.generateId(),
        content: userMessage,
        role: 'user',
        timestamp: new Date()
      };
      
      await storageService.saveChatMessage(userChatMessage);
      
      // Generate response
      return await this.generateResponse(userMessage, options);
      
    } catch (error) {
      console.error('❌ Chat failed:', error);
      throw error;
    }
  }

  // Document management
  async getDocuments(): Promise<Document[]> {
    return await storageService.getAllDocuments();
  }

  async deleteDocument(documentId: string): Promise<void> {
    await storageService.deleteDocument(documentId);
  }

  async getChatHistory(): Promise<ChatMessage[]> {
    return await storageService.getChatHistory();
  }

  async clearChatHistory(): Promise<void> {
    await storageService.clearChatHistory();
  }

  // System status
  async getSystemStatus(): Promise<{
    modelLoaded: boolean;
    modelLoading: boolean;
    modelName?: string;
    documentsCount: number;
    totalChunks: number;
    memoryUsage?: number;
    storageStats?: any;
  }> {
    const stats = await storageService.getStorageStats();
    
    return {
      modelLoaded: llmService.isModelLoaded(),
      modelLoading: llmService.isModelLoading(),
      modelName: llmService.getCurrentModel() || undefined,
      documentsCount: stats.documentsCount,
      totalChunks: stats.chunksCount,
      storageStats: stats
    };
  }

  // Privacy operations
  async exportUserData(): Promise<string> {
    return await storageService.exportAllData();
  }

  async deleteAllUserData(): Promise<void> {
    await storageService.deleteAllData();
    await llmService.unloadModel();
    console.log('🗑️  All user data deleted - Privacy guaranteed!');
  }

  // Utility methods
  private calculateSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Batch operations
  async processMultipleDocuments(files: File[]): Promise<Document[]> {
    const results: Document[] = [];
    
    for (let i = 0; i < files.length; i++) {
      try {
        this.updateProgress('uploading', (i / files.length) * 100, 
          `Processing ${files[i].name} (${i + 1} of ${files.length})`);
        
        const document = await this.processDocument(files[i]);
        results.push(document);
      } catch (error) {
        console.error(`Failed to process ${files[i].name}:`, error);
        // Continue with remaining files
      }
    }
    
    return results;
  }

  // Search across all documents with natural language queries
  async askQuestion(
    question: string,
    options?: {
      documentIds?: string[];
      detailedSources?: boolean;
    }
  ): Promise<{
    answer: string;
    sources: DocumentSource[];
    confidence: number;
  }> {
    const response = await this.generateResponse(question, options);
    
    const confidence = response.sources && response.sources.length > 0
      ? response.sources.reduce((sum, source) => sum + source.relevanceScore, 0) / response.sources.length
      : 0;
    
    return {
      answer: response.content,
      sources: response.sources || [],
      confidence
    };
  }
}

// Singleton instance
export const ragService = new PrivacyRAGService();