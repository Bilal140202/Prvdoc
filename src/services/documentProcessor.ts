// Privacy-first document processing - ALL processing happens locally
// Supports PDF (text + OCR), DOCX, TXT, and audio files

import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import mammoth from 'mammoth';
import type { 
  Document, 
  DocumentChunk, 
  DocumentType, 
  ProcessingProgress,
  ProcessingStage 
} from '../types';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export class PrivacyDocumentProcessor {
  private progressCallback?: (progress: ProcessingProgress) => void;
  
  setProgressCallback(callback: (progress: ProcessingProgress) => void): void {
    this.progressCallback = callback;
  }

  private updateProgress(stage: ProcessingStage, progress: number, message: string): void {
    this.progressCallback?.({
      stage,
      progress: Math.min(100, Math.max(0, progress)),
      message
    });
  }

  async processDocument(file: File): Promise<Document> {
    try {
      this.updateProgress('uploading', 0, 'Starting document processing...');

      const documentType = this.detectDocumentType(file);
      
      this.updateProgress('extracting', 10, `Processing ${documentType.toUpperCase()} file...`);

      let content = '';
      
      switch (documentType) {
        case 'pdf':
          content = await this.processPDF(file);
          break;
        case 'docx':
          content = await this.processDOCX(file);
          break;
        case 'txt':
          content = await this.processTXT(file);
          break;
        case 'audio':
          content = await this.processAudio(file);
          break;
        default:
          throw new Error(`Unsupported file type: ${file.type}`);
      }

      this.updateProgress('chunking', 60, 'Breaking document into chunks...');

      const chunks = await this.chunkDocument(content, {
        id: this.generateId(),
        name: file.name,
        content,
        type: documentType,
        size: file.size,
        uploadedAt: new Date()
      });

      this.updateProgress('complete', 100, 'Document processing complete!');

      return {
        id: this.generateId(),
        name: file.name,
        content,
        type: documentType,
        size: file.size,
        uploadedAt: new Date(),
        processedAt: new Date(),
        chunks
      };

    } catch (error) {
      this.updateProgress('error', 0, `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private detectDocumentType(file: File): DocumentType {
    const mimeType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return 'pdf';
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      return 'docx';
    } else if (mimeType.startsWith('text/') || fileName.endsWith('.txt')) {
      return 'txt';
    } else if (mimeType.startsWith('audio/')) {
      return 'audio';
    } else if (mimeType.startsWith('image/')) {
      return 'image';
    }
    
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  private async processPDF(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      const totalPages = pdf.numPages;
      
      this.updateProgress('extracting', 20, `Extracting text from ${totalPages} pages...`);

      let pagesProcessed = 0;
      const pagePromises = Array.from({ length: totalPages }, (_, i) => i + 1).map(async (pageNum) => {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        let pageText = textContent.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => item.str)
          .join(' ');
        
        // If no text found, try OCR
        if (pageText.trim().length < 50) {
          this.updateProgress('extracting', 20 + (pagesProcessed / totalPages) * 30,
            `Running OCR on page ${pageNum}...`);
          
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas
          }).promise;
          
          const ocrText = await this.runOCR(canvas);
          pageText = ocrText || pageText;
        }

        pagesProcessed++;
        const progress = 20 + (pagesProcessed / totalPages) * 40;
        this.updateProgress('extracting', progress,
          `Processed page ${pageNum} of ${totalPages}`);
        
        if (pageText.trim()) {
          return `\n\n--- Page ${pageNum} ---\n${pageText}`;
        }
        return '';
      });

      const pageTexts = await Promise.all(pagePromises);
      fullText += pageTexts.join('');
      
      return fullText.trim();
      
    } catch (error) {
      console.error('PDF processing error:', error);
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async runOCR(canvas: HTMLCanvasElement): Promise<string> {
    try {
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(canvas);
      await worker.terminate();
      return text;
    } catch (error) {
      console.error('OCR failed:', error);
      return '';
    }
  }

  private async processDOCX(file: File): Promise<string> {
    try {
      this.updateProgress('extracting', 30, 'Extracting text from Word document...');
      
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (result.messages.length > 0) {
        console.warn('DOCX processing warnings:', result.messages);
      }
      
      return result.value;
      
    } catch (error) {
      console.error('DOCX processing error:', error);
      throw new Error(`Failed to process DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processTXT(file: File): Promise<string> {
    try {
      this.updateProgress('extracting', 30, 'Reading text file...');
      return await file.text();
    } catch (error) {
      console.error('TXT processing error:', error);
      throw new Error(`Failed to process text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processAudio(file: File): Promise<string> {
    try {
      this.updateProgress('extracting', 30, 'Transcribing audio...');
      
      // Use Web Speech API if available
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        return await this.transcribeWithWebSpeech(file);
      } else {
        throw new Error('Speech recognition not supported in this browser');
      }
    } catch (error) {
      console.error('Audio processing error:', error);
      throw new Error(`Failed to process audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async transcribeWithWebSpeech(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = (window as any).SpeechRecognition || 
                               (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      let transcript = '';

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
      };

      recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.onend = () => {
        resolve(transcript.trim());
      };

      // Create audio element to play the file
      const audio = document.createElement('audio');
      audio.src = URL.createObjectURL(file);
      audio.play();
      
      recognition.start();
      
      // Stop recognition when audio ends
      audio.addEventListener('ended', () => {
        recognition.stop();
      });
    });
  }

  private async chunkDocument(content: string, document: Omit<Document, 'chunks'>): Promise<DocumentChunk[]> {
    const CHUNK_SIZE = 1000; // characters
    const OVERLAP = 200;     // character overlap between chunks
    
    const chunks: DocumentChunk[] = [];
    let startIndex = 0;
    
    // Split by paragraphs first, then by sentences if needed
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    for (const paragraph of paragraphs) {
      if (paragraph.length <= CHUNK_SIZE) {
        // Paragraph fits in one chunk
        chunks.push({
          id: this.generateId(),
          documentId: document.id!,
          content: paragraph.trim(),
          startIndex,
          endIndex: startIndex + paragraph.length
        });
        startIndex += paragraph.length;
      } else {
        // Split large paragraphs into overlapping chunks
        let paragraphStart = 0;
        while (paragraphStart < paragraph.length) {
          const endIndex = Math.min(paragraphStart + CHUNK_SIZE, paragraph.length);
          const chunkContent = paragraph.slice(paragraphStart, endIndex).trim();
          
          if (chunkContent) {
            chunks.push({
              id: this.generateId(),
              documentId: document.id!,
              content: chunkContent,
              startIndex: startIndex + paragraphStart,
              endIndex: startIndex + endIndex
            });
          }
          
          paragraphStart += CHUNK_SIZE - OVERLAP;
        }
        startIndex += paragraph.length;
      }
    }

    // Add page information for PDFs
    if (document.type === 'pdf') {
      this.addPageNumbers(chunks, content);
    }
    
    return chunks;
  }

  private addPageNumbers(chunks: DocumentChunk[], content: string): void {
    const pageMarkers = content.match(/--- Page (\d+) ---/g) || [];
    const pageStarts: { page: number; index: number }[] = [];
    
    pageMarkers.forEach(marker => {
      const pageMatch = marker.match(/--- Page (\d+) ---/);
      if (pageMatch) {
        const pageNum = parseInt(pageMatch[1], 10);
        const index = content.indexOf(marker);
        pageStarts.push({ page: pageNum, index });
      }
    });
    
    // Assign page numbers to chunks
    chunks.forEach(chunk => {
      const chunkStart = chunk.startIndex;
      
      // Find the page this chunk belongs to
      let page = 1;
      for (let i = pageStarts.length - 1; i >= 0; i--) {
        if (chunkStart >= pageStarts[i].index) {
          page = pageStarts[i].page;
          break;
        }
      }
      
      chunk.page = page;
    });
  }

  private generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper method for batch processing
  async processMultipleDocuments(files: File[]): Promise<Document[]> {
    const documents: Document[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      this.updateProgress('uploading', (i / files.length) * 100, 
        `Processing ${file.name} (${i + 1} of ${files.length})`);
      
      try {
        const document = await this.processDocument(file);
        documents.push(document);
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        // Continue with other files
      }
    }
    
    return documents;
  }

  // Extract metadata for documents
  extractMetadata(file: File): Record<string, any> {
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: new Date(file.lastModified),
      processingDate: new Date()
    };
  }
}

// Singleton instance
export const documentProcessor = new PrivacyDocumentProcessor();