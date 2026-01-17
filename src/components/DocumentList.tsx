import { useState } from 'react';
import type { Document, ProcessingProgress } from '../types';

interface DocumentListProps {
  documents: Document[];
  onDelete: (documentId: string) => void;
  onUpload: (files: File[]) => Promise<void>;
  processing: boolean;
  progress?: ProcessingProgress | null;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onDelete,
  onUpload,
  processing,
  progress
}) => {
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getDocumentIcon = (type: string): string => {
    switch (type) {
      case 'pdf': return '📕';
      case 'docx': return '📘';
      case 'txt': return '📄';
      case 'audio': return '🎵';
      case 'image': return '🖼️';
      default: return '📄';
    }
  };

  const sortedDocuments = [...documents].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'date':
        comparison = a.uploadedAt.getTime() - b.uploadedAt.getTime();
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const toggleSelection = (documentId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  const selectAll = () => {
    if (selectedDocuments.size === documents.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(documents.map(doc => doc.id)));
    }
  };

  const deleteSelected = () => {
    if (selectedDocuments.size === 0) return;
    
    const count = selectedDocuments.size;
    if (window.confirm(`Delete ${count} selected document${count > 1 ? 's' : ''}?`)) {
      selectedDocuments.forEach(docId => onDelete(docId));
      setSelectedDocuments(new Set());
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        await onUpload(Array.from(files));
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
    e.target.value = ''; // Reset input
  };

  return (
    <div className="document-list">
      <div className="document-list-header">
        <h2>📄 Your Documents</h2>
        
        <div className="document-controls">
          <div className="sort-controls">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'size')}
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
            </select>
            
            <button 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="sort-order-button"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <div className="bulk-actions">
            {documents.length > 0 && (
              <>
                <button onClick={selectAll} className="select-all-button">
                  {selectedDocuments.size === documents.length ? 'Deselect All' : 'Select All'}
                </button>
                
                {selectedDocuments.size > 0 && (
                  <button 
                    onClick={deleteSelected} 
                    className="delete-selected-button"
                  >
                    🗑️ Delete Selected ({selectedDocuments.size})
                  </button>
                )}
              </>
            )}
          </div>

          <label className="add-documents-button">
            + Add Documents
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.mp3,.wav,.m4a"
              onChange={handleFileInput}
              disabled={processing}
            />
          </label>
        </div>
      </div>

      {processing && progress && (
        <div className="processing-banner">
          <div className="processing-info">
            <span className="processing-icon">⚡</span>
            <span className="processing-stage">{progress.stage}</span>
            <span className="processing-message">{progress.message}</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="empty-document-list">
          <div className="empty-icon">📂</div>
          <h3>No documents uploaded yet</h3>
          <p>Upload your first document to start analyzing with PrivacyThink!</p>
          <label className="upload-first-button">
            📄 Upload Your First Document
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.mp3,.wav,.m4a"
              onChange={handleFileInput}
              disabled={processing}
            />
          </label>
        </div>
      ) : (
        <div className="documents-grid">
          {sortedDocuments.map((document) => (
            <div 
              key={document.id} 
              className={`document-card ${selectedDocuments.has(document.id) ? 'selected' : ''}`}
            >
              <div className="document-header">
                <input
                  type="checkbox"
                  checked={selectedDocuments.has(document.id)}
                  onChange={() => toggleSelection(document.id)}
                  className="document-checkbox"
                />
                
                <div className="document-icon">
                  {getDocumentIcon(document.type)}
                </div>
                
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${document.name}"?`)) {
                      onDelete(document.id);
                    }
                  }}
                  className="delete-document-button"
                  title="Delete document"
                >
                  🗑️
                </button>
              </div>

              <div className="document-info">
                <h3 className="document-name" title={document.name}>
                  {document.name}
                </h3>
                
                <div className="document-meta">
                  <span className="document-type">
                    {document.type.toUpperCase()}
                  </span>
                  <span className="document-size">
                    {formatFileSize(document.size)}
                  </span>
                </div>

                <div className="document-stats">
                  <span className="chunks-count">
                    {document.chunks?.length || 0} chunks
                  </span>
                  {document.processedAt && (
                    <span className="processing-status">✅ Processed</span>
                  )}
                </div>

                <div className="document-dates">
                  <div className="upload-date">
                    <strong>Uploaded:</strong> {formatDate(document.uploadedAt)}
                  </div>
                  {document.processedAt && (
                    <div className="processed-date">
                      <strong>Processed:</strong> {formatDate(document.processedAt)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="document-list-footer">
        <div className="document-summary">
          <span>{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
          {documents.length > 0 && (
            <>
              <span>•</span>
              <span>
                {formatFileSize(documents.reduce((total, doc) => total + doc.size, 0))} total
              </span>
              <span>•</span>
              <span>
                {documents.reduce((total, doc) => total + (doc.chunks?.length || 0), 0)} chunks indexed
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentList;