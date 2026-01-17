import { useState, useEffect } from 'react';
import { llmService } from '../services';
import type { ModelDownloadProgress, AvailableModel } from '../types';

const ModelDownloader: React.FC = () => {
  const [downloadProgress, setDownloadProgress] = useState<ModelDownloadProgress | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('Xenova/TinyLlama-1.1B-Chat-v1.0');
  const [availableModels] = useState<AvailableModel[]>([
    {
      name: 'Xenova/TinyLlama-1.1B-Chat-v1.0',
      displayName: 'TinyLlama 1.1B (Recommended)',
      size: 1.1 * 1024 * 1024 * 1024, // ~1.1GB
      description: 'Fast, lightweight model perfect for document Q&A. Great for most users.',
      performance: 'fast',
      memoryRequirement: 3,
      quantization: '4bit',
      isRecommended: true
    },
    {
      name: 'Xenova/Phi-3.5-mini-instruct',
      displayName: 'Phi-3.5 Mini',
      size: 2.4 * 1024 * 1024 * 1024, // ~2.4GB
      description: 'Balanced performance and accuracy. Better reasoning for complex questions.',
      performance: 'balanced',
      memoryRequirement: 6,
      quantization: '4bit'
    }
  ]);
  // const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      const progress = llmService.getDownloadProgress();
      setDownloadProgress(progress);
    };

    const interval = setInterval(checkStatus, 500);
    return () => clearInterval(interval);
  }, []);

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond?: number): string => {
    if (!bytesPerSecond) return '';
    return `${formatFileSize(bytesPerSecond)}/s`;
  };

  const getPerformanceColor = (performance: string): string => {
    switch (performance) {
      case 'fast': return '#22c55e';
      case 'balanced': return '#f59e0b';
      case 'accurate': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const handleStartDownload = async () => {
    try {
      await llmService.initialize(selectedModel);
    } catch (error) {
      console.error('Failed to download model:', error);
    }
  };

  const isDownloading = downloadProgress?.status === 'downloading' || downloadProgress?.status === 'loading';
  const isComplete = downloadProgress?.status === 'ready';
  const hasError = downloadProgress?.status === 'error';

  if (isComplete) {
    return (
      <div className="model-downloader success">
        <div className="download-complete">
          <div className="success-icon">✅</div>
          <h3>Model Ready!</h3>
          <p>PrivacyThink is ready for private document analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="model-downloader">
      <div className="download-header">
        <h3>🤖 AI Model Setup</h3>
        <p>Choose an AI model to download. This only happens once.</p>
      </div>

      {!isDownloading && !hasError && (
        <div className="model-selection">
          <div className="model-options">
            {availableModels.map((model) => (
              <div 
                key={model.name}
                className={`model-option ${selectedModel === model.name ? 'selected' : ''} ${model.isRecommended ? 'recommended' : ''}`}
                onClick={() => setSelectedModel(model.name)}
              >
                {model.isRecommended && (
                  <div className="recommended-badge">Recommended</div>
                )}
                
                <div className="model-info">
                  <h4>{model.displayName}</h4>
                  <p className="model-description">{model.description}</p>
                  
                  <div className="model-specs">
                    <div className="spec">
                      <span className="spec-label">Size:</span>
                      <span className="spec-value">{formatFileSize(model.size)}</span>
                    </div>
                    
                    <div className="spec">
                      <span className="spec-label">Memory:</span>
                      <span className="spec-value">{model.memoryRequirement}GB RAM</span>
                    </div>
                    
                    <div className="spec">
                      <span className="spec-label">Performance:</span>
                      <span 
                        className="spec-value performance-badge"
                        style={{ backgroundColor: getPerformanceColor(model.performance) }}
                      >
                        {model.performance}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="model-radio">
                  <input
                    type="radio"
                    name="model"
                    value={model.name}
                    checked={selectedModel === model.name}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="download-info">
            <div className="info-section">
              <h4>💡 What happens during download:</h4>
              <ul>
                <li>Model is downloaded directly to your browser</li>
                <li>Nothing is uploaded or sent to any server</li>
                <li>After download, PrivacyThink works completely offline</li>
                <li>You can delete the model anytime from browser settings</li>
              </ul>
            </div>

            <div className="system-requirements">
              <h4>💻 System Requirements:</h4>
              <ul>
                <li>Modern browser (Chrome 110+, Firefox 120+, Safari 17+)</li>
                <li>8GB+ RAM recommended for best performance</li>
                <li>Fast internet for initial download</li>
                <li>Sufficient storage space for model</li>
              </ul>
            </div>
          </div>

          <button 
            onClick={handleStartDownload}
            className="download-button"
            disabled={!selectedModel}
          >
            🚀 Download & Start PrivacyThink
          </button>
        </div>
      )}

      {isDownloading && downloadProgress && (
        <div className="download-progress">
          <div className="progress-header">
            <h4>Downloading {downloadProgress.modelName}</h4>
            <p>{downloadProgress.message || 'This may take a few minutes...'}</p>
          </div>

          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${downloadProgress.progress}%` }}
            />
          </div>

          <div className="progress-stats">
            <div className="stat">
              <span className="stat-label">Progress:</span>
              <span className="stat-value">{downloadProgress.progress.toFixed(1)}%</span>
            </div>
            
            <div className="stat">
              <span className="stat-label">Downloaded:</span>
              <span className="stat-value">
                {formatFileSize(downloadProgress.bytesLoaded)} / {formatFileSize(downloadProgress.totalBytes)}
              </span>
            </div>
            
            {downloadProgress.speed && (
              <div className="stat">
                <span className="stat-label">Speed:</span>
                <span className="stat-value">{formatSpeed(downloadProgress.speed)}</span>
              </div>
            )}
          </div>

          <div className="download-tips">
            <p>💡 <strong>Tip:</strong> Keep this tab open and avoid using other intensive applications during download for best performance.</p>
          </div>
        </div>
      )}

      {hasError && downloadProgress?.error && (
        <div className="download-error">
          <h4>❌ Download Failed</h4>
          <p>{downloadProgress.error}</p>
          <button onClick={handleStartDownload} className="retry-button">
            🔄 Try Again
          </button>
        </div>
      )}

      <div className="privacy-reminder">
        🔒 <strong>Privacy:</strong> The model downloads directly to your browser. 
        No personal data is sent during this process.
      </div>
    </div>
  );
};

export default ModelDownloader;