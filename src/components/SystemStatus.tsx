
import type { SystemStatus as SystemStatusType } from '../types';

interface SystemStatusProps {
  status: SystemStatusType;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ status }) => {
  const formatMemoryUsage = (bytes?: number): string => {
    if (!bytes) return 'Unknown';
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="system-status">
      <h2>⚡ System Status</h2>
      
      <div className="status-cards">
        <div className={`status-card ${status.modelLoaded ? 'success' : 'warning'}`}>
          <div className="status-icon">
            {status.modelLoading ? '⏳' : status.modelLoaded ? '🤖' : '❌'}
          </div>
          <div className="status-content">
            <h3>AI Model</h3>
            <div className="status-value">
              {status.modelLoading ? 'Loading...' : 
               status.modelLoaded ? 'Ready' : 'Not Loaded'}
            </div>
            {status.modelName && (
              <div className="status-detail">{status.modelName}</div>
            )}
            {status.modelSize && (
              <div className="status-detail">Size: {status.modelSize}</div>
            )}
          </div>
        </div>

        <div className="status-card info">
          <div className="status-icon">📚</div>
          <div className="status-content">
            <h3>Documents</h3>
            <div className="status-value">{status.documentsCount}</div>
            <div className="status-detail">
              {status.totalChunks} chunks indexed
            </div>
          </div>
        </div>

        <div className="status-card info">
          <div className="status-icon">💾</div>
          <div className="status-content">
            <h3>Memory Usage</h3>
            <div className="status-value">
              {formatMemoryUsage(status.memoryUsage)}
            </div>
            <div className="status-detail">Local only</div>
          </div>
        </div>

        <div className={`status-card ${status.isOnline ? 'success' : 'warning'}`}>
          <div className="status-icon">
            {status.isOnline ? '🌐' : '📴'}
          </div>
          <div className="status-content">
            <h3>Network</h3>
            <div className="status-value">
              {status.isOnline ? 'Online' : 'Offline'}
            </div>
            <div className="status-detail">
              Processing works offline
            </div>
          </div>
        </div>
      </div>

      <div className="privacy-guarantee">
        <div className="privacy-icon">🔒</div>
        <div className="privacy-content">
          <h3>Privacy Guarantee</h3>
          <ul>
            <li>✅ All processing happens locally on your device</li>
            <li>✅ No documents or data sent to any server</li>
            <li>✅ Works completely offline after model download</li>
            <li>✅ Your data never leaves your browser</li>
          </ul>
        </div>
      </div>

      <div className="technical-info">
        <h3>🔧 Technical Information</h3>
        <div className="tech-details">
          <div className="tech-item">
            <strong>Storage:</strong> IndexedDB (local browser database)
          </div>
          <div className="tech-item">
            <strong>AI Processing:</strong> WebAssembly + Transformers.js
          </div>
          <div className="tech-item">
            <strong>Document Processing:</strong> PDF.js + Tesseract.js + Mammoth
          </div>
          <div className="tech-item">
            <strong>Vector Search:</strong> Local cosine similarity
          </div>
        </div>
      </div>

      <div className="performance-tips">
        <h3>⚡ Performance Tips</h3>
        <ul>
          <li>Recommended: 8GB+ RAM for best performance</li>
          <li>Large documents (&gt;50MB) may take longer to process</li>
          <li>Chrome and Firefox work best with WebAssembly</li>
          <li>Close other tabs while processing large files</li>
        </ul>
      </div>
    </div>
  );
};

export default SystemStatus;