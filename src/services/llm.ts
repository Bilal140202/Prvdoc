// Privacy-first LLM service - ALL processing happens in browser
// NO data ever leaves the user's device

import { 
  pipeline, 
  env,
  TextGenerationPipeline,
  FeatureExtractionPipeline 
} from '@xenova/transformers';
import type { 
  LLMConfig, 
  ModelDownloadProgress, 
  AvailableModel
} from '../types';

// Configure Transformers.js
// Disable local models to prevent 404 HTML fallback errors (SPA issue); uses remote + cache
env.allowLocalModels = false;
env.allowRemoteModels = true; // Only for initial model download
env.useBrowserCache = true;

export class PrivacyLLMService {
  private textGenerator: TextGenerationPipeline | null = null;
  private embedder: FeatureExtractionPipeline | null = null;
  private currentModel: string | null = null;
  private modelConfig: LLMConfig | null = null;
  private isLoading = false;
  private downloadProgress: ModelDownloadProgress | null = null;

  // Available models optimized for browser use
  private readonly AVAILABLE_MODELS: AvailableModel[] = [
    {
      name: 'Xenova/TinyLlama-1.1B-Chat-v1.0',
      displayName: 'TinyLlama 1.1B (Recommended)',
      size: 1.1 * 1024 * 1024 * 1024, // ~1.1GB
      description: 'Fast, lightweight model perfect for document Q&A',
      performance: 'fast',
      memoryRequirement: 3,
      quantization: '4bit',
      isRecommended: true
    },
    {
      name: 'Xenova/Phi-3.5-mini-instruct',
      displayName: 'Phi-3.5 Mini',
      size: 2.4 * 1024 * 1024 * 1024, // ~2.4GB
      description: 'Balanced performance and accuracy for most tasks',
      performance: 'balanced',
      memoryRequirement: 6,
      quantization: '4bit'
    },
    {
      name: 'Xenova/all-MiniLM-L6-v2',
      displayName: 'MiniLM Embeddings',
      size: 90 * 1024 * 1024, // ~90MB
      description: 'Sentence embeddings for document search',
      performance: 'fast',
      memoryRequirement: 1,
      quantization: '4bit'
    }
  ];

  async initialize(modelName?: string, retry = true): Promise<void> {
    if (this.isLoading) {
      throw new Error('Model is already loading');
    }

    const targetModel = modelName || 'Xenova/TinyLlama-1.1B-Chat-v1.0';
    
    try {
      this.isLoading = true;
      this.currentModel = targetModel;

      console.log(`🤖 Loading ${targetModel} - ALL processing stays local!`);
      
      // Check storage availability before starting download
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        let estimate;
        try {
          estimate = await navigator.storage.estimate();
        } catch (storageError) {
          console.warn('⚠️ Could not verify storage space:', storageError);
        }

        if (estimate && estimate.quota && estimate.usage) {
          const availableSpace = estimate.quota - estimate.usage;
          const requiredSpace = this.getModelSize(targetModel) * 2; // Buffer for unzip/cache

          if (availableSpace < requiredSpace) {
            throw new Error(`Insufficient storage space. Need ${Math.round(requiredSpace / 1024 / 1024)}MB, but only ${Math.round(availableSpace / 1024 / 1024)}MB available.`);
          }
        }
      }

      // Set up progress tracking
      this.downloadProgress = {
        modelName: targetModel,
        bytesLoaded: 0,
        totalBytes: this.getModelSize(targetModel),
        progress: 0,
        status: 'downloading'
      };

      // Load text generation model
      this.textGenerator = await pipeline(
        'text-generation',
        targetModel,
        {
          progress_callback: (progress: any) => {
            this.updateDownloadProgress(progress);
          }
        }
      ) as TextGenerationPipeline;

      // Load embedding model for RAG
      this.embedder = await pipeline(
        'feature-extraction', 
        'Xenova/all-MiniLM-L6-v2'
      ) as FeatureExtractionPipeline;

      this.modelConfig = {
        modelName: targetModel,
        modelSize: this.getModelPerformance(targetModel),
        quantization: '4bit',
        contextLength: 2048,
        temperature: 0.7
      };

      this.downloadProgress = {
        ...this.downloadProgress,
        progress: 100,
        status: 'ready'
      };

      console.log('✅ LLM loaded successfully - Ready for private document analysis!');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Handle corrupted cache from previous failed downloads
      // "offset is out of bounds" suggests reading past end of file (e.g. reading binary offset in HTML file)
      // "Unexpected token <" suggests parsing HTML as JSON
      if (retry && (
        errorMessage.includes('offset is out of bounds') ||
        errorMessage.includes('Unexpected token') ||
        errorMessage.includes('invalid json')
      )) {
        console.warn('⚠️  Cache corruption detected. Clearing cache and retrying...');

        try {
          if ('caches' in window) {
            // Inform user we are recovering
            this.downloadProgress = {
              ...this.downloadProgress!,
              status: 'downloading', // Keep status as downloading so UI doesn't show error yet
              message: 'Cache corruption detected. Clearing cache and retrying...'
            };

            const cacheKeys = await caches.keys();
            for (const key of cacheKeys) {
              if (key.includes('transformers')) {
                await caches.delete(key);
                console.log(`🧹 Deleted cache: ${key}`);
              }
            }

            // Wait a moment for cache operations to settle
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          this.isLoading = false;
          // Retry without recursion limit (retry=false)
          return this.initialize(modelName, false);
        } catch (cacheError) {
          console.error('Failed to clear cache:', cacheError);
        }
      }

      this.downloadProgress = {
        ...this.downloadProgress!,
        status: 'error',
        error: errorMessage
      };
      
      console.error('❌ Failed to load LLM:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  private updateDownloadProgress(progress: any): void {
    if (!this.downloadProgress) return;

    if (progress.loaded && progress.total) {
      this.downloadProgress = {
        ...this.downloadProgress,
        bytesLoaded: progress.loaded,
        totalBytes: progress.total,
        progress: Math.round((progress.loaded / progress.total) * 100),
        speed: progress.speed
      };
    }
  }

  private getModelSize(modelName: string): number {
    const model = this.AVAILABLE_MODELS.find(m => m.name === modelName);
    return model?.size || 1000000000; // 1GB default
  }

  private getModelPerformance(modelName: string): 'small' | 'medium' | 'large' {
    const model = this.AVAILABLE_MODELS.find(m => m.name === modelName);
    switch (model?.performance) {
      case 'fast': return 'small';
      case 'balanced': return 'medium';
      case 'accurate': return 'large';
      default: return 'small';
    }
  }

  // Generate text embeddings for RAG - ALL LOCAL
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.embedder) {
      throw new Error('Embedding model not loaded. Call initialize() first.');
    }

    try {
      const result = await this.embedder(text, { 
        pooling: 'mean',
        normalize: true 
      });
      
      // Convert to regular array
      return Array.from(result.data as Float32Array);
    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      throw error;
    }
  }

  // Generate text response - ALL LOCAL
  async generateText(
    prompt: string, 
    context?: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      stopSequences?: string[];
    }
  ): Promise<string> {
    if (!this.textGenerator) {
      throw new Error('Text generation model not loaded. Call initialize() first.');
    }

    try {
      const fullPrompt = this.buildPrompt(prompt, context);
      
      const result = await this.textGenerator(fullPrompt, {
        max_new_tokens: options?.maxTokens || 256,
        temperature: options?.temperature || this.modelConfig?.temperature || 0.7,
        do_sample: true,
        return_full_text: false
      });

      const generatedText = Array.isArray(result) ? 
        (result[0] as any)?.generated_text : 
        (result as any).generated_text;
      
      return this.cleanResponse(generatedText || '');
      
    } catch (error) {
      console.error('❌ Failed to generate text:', error);
      throw error;
    }
  }

  private buildPrompt(userQuestion: string, context?: string): string {
    if (context) {
      return `<|system|>
You are PrivacyThink, a privacy-first AI assistant that helps users analyze their documents. All processing happens locally on their device - no data ever leaves their computer.

Use the following context from the user's documents to answer their question. Be helpful, accurate, and always cite which document or page your information comes from.

Context from documents:
${context}

<|user|>
${userQuestion}

<|assistant|>
`;
    } else {
      return `<|system|>
You are PrivacyThink, a privacy-first AI assistant. All processing happens locally - no data ever leaves the user's device.

<|user|>
${userQuestion}

<|assistant|>
`;
    }
  }

  private cleanResponse(text: string): string {
    // Remove common artifacts from model output
    return text
      .replace(/^[\s\n]+/, '') // Remove leading whitespace
      .replace(/[\s\n]+$/, '') // Remove trailing whitespace
      .replace(/<\|.*?\|>/g, '') // Remove special tokens
      .trim();
  }

  // Batch process embeddings for documents
  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }
    
    return embeddings;
  }

  // Model management
  getAvailableModels(): AvailableModel[] {
    return [...this.AVAILABLE_MODELS];
  }

  getCurrentModel(): string | null {
    return this.currentModel;
  }

  getModelConfig(): LLMConfig | null {
    return this.modelConfig;
  }

  getDownloadProgress(): ModelDownloadProgress | null {
    return this.downloadProgress;
  }

  isModelLoaded(): boolean {
    return !!(this.textGenerator && this.embedder && !this.isLoading);
  }

  isModelLoading(): boolean {
    return this.isLoading;
  }

  // Memory management
  async unloadModel(): Promise<void> {
    this.textGenerator = null;
    this.embedder = null;
    this.currentModel = null;
    this.modelConfig = null;
    this.downloadProgress = null;
    
    // Force garbage collection if available
    if ('gc' in window && typeof window.gc === 'function') {
      window.gc();
    }
    
    console.log('🗑️  Model unloaded to free memory');
  }

  // System requirements check
  checkSystemRequirements(): {
    supported: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // Check WebAssembly support
    if (!('WebAssembly' in window)) {
      warnings.push('WebAssembly not supported - models cannot run');
    }
    
    // Check memory (rough estimate)
    const memory = (navigator as any).deviceMemory;
    if (memory && memory < 8) {
      warnings.push('Low device memory detected - consider using smaller models');
      recommendations.push('Use TinyLlama model for better performance');
    }
    
    // Check for dedicated GPU
    if (!('gpu' in navigator)) {
      recommendations.push('Hardware acceleration unavailable - processing may be slower');
    }
    
    // Check storage
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        const available = estimate.quota! - estimate.usage!;
        if (available < 5 * 1024 * 1024 * 1024) { // 5GB
          recommendations.push('Low storage space - consider smaller models');
        }
      });
    }

    return {
      supported: warnings.length === 0,
      warnings,
      recommendations
    };
  }
}

// Singleton instance
export const llmService = new PrivacyLLMService();