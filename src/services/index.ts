// Service instances for PrivacyThink
// All services operate locally with zero external data transmission

import { PrivacyStorageService } from './storage';
import { PrivacyLLMService } from './llm';
import { PrivacyDocumentProcessor } from './documentProcessor';
import { PrivacyRAGService } from './rag';

// Create singleton instances
export const storageService = new PrivacyStorageService();
export const llmService = new PrivacyLLMService();
export const documentProcessor = new PrivacyDocumentProcessor();
export const ragService = new PrivacyRAGService();

// Export types for convenience
export type {
  Document,
  DocumentChunk,
  DocumentType,
  ChatMessage,
  DocumentSource,
  LLMConfig,
  ProcessingProgress,
  ProcessingStage,
  SystemStatus,
  SearchResult,
  PrivacySettings,
  ModelDownloadProgress,
  AvailableModel,
  PrivacyThinkError
} from '../types';