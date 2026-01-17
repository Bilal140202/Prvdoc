import { useCallback, useState } from 'react';
import type { ProcessingProgress } from '../types';

interface DocumentUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  processing: boolean;
  progress?: ProcessingProgress | null;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUpload,
  processing,
  progress
}) => {
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(file => {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'audio/mpeg',
        'audio/wav',
        'audio/m4a'
      ];
      
      const validExtensions = ['.pdf', '.docx', '.txt', '.mp3', '.wav', '.m4a'];
      
      return validTypes.includes(file.type) || 
             validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    });

    if (validFiles.length === 0) {
      alert('Please upload supported file types: PDF, DOCX, TXT, or audio files.');
      return;
    }

    if (validFiles.some(file => file.size > 100 * 1024 * 1024)) { // 100MB limit
      alert('File size must be under 100MB for optimal performance.');
      return;
    }

    try {
      await onUpload(validFiles);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [onUpload]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (processing) return;
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [handleFiles, processing]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    handleFiles(files);
    
    // Reset input
    e.target.value = '';
  }, [handleFiles]);

  return (
    <div className="document-upload">
      <div
        className={`upload-zone ${dragActive ? 'drag-active' : ''} ${processing ? 'processing' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {processing && progress ? (
          <div className="upload-progress">
            <div className="progress-icon">⚡</div>
            <div className="progress-info">
              <div className="progress-stage">{progress.stage}</div>
              <div className="progress-message">{progress.message}</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${progress.progress}%` }}
                />
                <span className="progress-percent">{Math.round(progress.progress)}%</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="upload-icon">📄</div>
            <h3>Add Documents</h3>
            <p>
              Drag & drop files here or{' '}
              <label className="file-input-label">
                choose files
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.mp3,.wav,.m4a"
                  onChange={handleFileInput}
                  disabled={processing}
                />
              </label>
            </p>
            <div className="supported-types">
              <span>Supported: PDF, DOCX, TXT, Audio</span>
            </div>
          </>
        )}
      </div>

      <div className="privacy-reminder">
        🔒 <strong>Privacy:</strong> Files are processed locally on your device.
        Nothing is uploaded to any server.
      </div>
    </div>
  );
};

export default DocumentUpload;