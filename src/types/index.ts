// Core types for PrivacyThink - Privacy-first document analysis

export interface Document {
  id: string;
  name: string;
  content: string;
  type: DocumentType;
  size: number;
  uploadedAt: Date;
  processedAt?: Date;
  chunks?: DocumentChunk[];
  embeddings?: number[][];
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  startIndex: number;
  endIndex: number;
  page?: number;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export type DocumentType = 'pdf' | 'docx' | 'txt' | 'audio' | 'image';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  sources?: DocumentSource[];
  processing?: boolean;
}

export interface DocumentSource {
  documentId: string;
  documentName: string;
  chunkId: string;
  content: string;
  page?: number;
  relevanceScore: number;
}

export interface LLMConfig {
  modelName: string;
  modelSize: 'small' | 'medium' | 'large';
  quantization: '4bit' | '8bit' | 'fp16';
  contextLength: number;
  temperature: number;
}

export interface ProcessingProgress {
  stage: ProcessingStage;
  progress: number; // 0-100
  message: string;
  error?: string;
}

export type ProcessingStage = 
  | 'uploading'
  | 'extracting'
  | 'chunking' 
  | 'embedding'
  | 'indexing'
  | 'complete'
  | 'error';

export interface SystemStatus {
  modelLoaded: boolean;
  modelLoading: boolean;
  modelName?: string;
  modelSize?: string;
  memoryUsage?: number;
  documentsCount: number;
  totalChunks: number;
  isOnline: boolean;
}

export interface SearchResult {
  chunks: DocumentChunk[];
  totalResults: number;
  maxRelevanceScore: number;
  averageRelevanceScore: number;
}

export interface PrivacySettings {
  autoDeleteAfterDays?: number;
  encryptStorage: boolean;
  enableAnalytics: boolean; // Always false for privacy
  maxDocuments: number;
  maxTotalSize: number; // in bytes
}

// Model configuration interfaces
export interface ModelDownloadProgress {
  modelName: string;
  bytesLoaded: number;
  totalBytes: number;
  progress: number; // 0-100
  speed?: number; // bytes per second
  status: 'downloading' | 'loading' | 'ready' | 'error';
  error?: string;
}

export interface AvailableModel {
  name: string;
  displayName: string;
  size: number; // in bytes
  description: string;
  performance: 'fast' | 'balanced' | 'accurate';
  memoryRequirement: number; // in GB
  quantization: '4bit' | '8bit';
  downloadUrl?: string;
  isRecommended?: boolean;
}

// Storage interfaces for IndexedDB
export interface StoredDocument {
  id: string;
  name: string;
  type: DocumentType;
  size: number;
  uploadedAt: string;
  processedAt?: string;
  content: string;
  chunks: StoredChunk[];
}

export interface StoredChunk {
  id: string;
  documentId: string;
  content: string;
  startIndex: number;
  endIndex: number;
  page?: number;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface VectorSearchOptions {
  query: string;
  topK: number;
  threshold: number;
  documentIds?: string[];
}

// Error types
export interface PrivacyThinkError {
  message: string;
  code: string;
  category: 'model' | 'document' | 'storage' | 'network' | 'processing';
}