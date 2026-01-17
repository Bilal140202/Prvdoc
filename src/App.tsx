import { useState, useEffect } from 'react';
import { ragService } from './services';
import DocumentUpload from './components/DocumentUpload';
import ChatInterface from './components/ChatInterface';
import DocumentList from './components/DocumentList';
import SystemStatus from './components/SystemStatus';
import PrivacyNotice from './components/PrivacyNotice';
import ModelDownloader from './components/ModelDownloader';
import type { 
  Document, 
  ChatMessage, 
  ProcessingProgress,
  SystemStatus as SystemStatusType 
} from './types';
import './App.css';

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatusType>({
    modelLoaded: false,
    modelLoading: false,
    documentsCount: 0,
    totalChunks: 0,
    isOnline: navigator.onLine
  });
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'documents' | 'settings'>('chat');
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeApp = async () => {
    try {
      setError(null);
      
      // Set up progress callback
      ragService.setProgressCallback(setProcessingProgress);
      
      // Initialize RAG system
      await ragService.initialize();
      
      // Load existing documents and chat history
      const [docs, messages] = await Promise.all([
        ragService.getDocuments(),
        ragService.getChatHistory()
      ]);
      
      setDocuments(docs);
      setChatMessages(messages);
      setInitialized(true);
      
      console.log('✅ PrivacyThink ready!');
      
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize PrivacyThink');
    }
  };

  // Initialize PrivacyThink on component mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Update system status periodically
  useEffect(() => {
    const updateStatus = async () => {
      try {
        const status = await ragService.getSystemStatus();
        setSystemStatus({
          ...status,
          isOnline: navigator.onLine
        });
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDocumentUpload = async (files: File[]) => {
    try {
      setError(null);
      
      for (const file of files) {
        const document = await ragService.processDocument(file);
        setDocuments(prev => [...prev, document]);
      }
      
      setProcessingProgress(null);
      
    } catch (error) {
      console.error('Document upload failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to process document');
      setProcessingProgress(null);
    }
  };

  const handleChatMessage = async (message: string) => {
    try {
      setError(null);
      
      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        content: message,
        role: 'user',
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, userMessage]);
      
      // Generate response
      const response = await ragService.chat(message);
      setChatMessages(prev => [...prev, response]);
      
    } catch (error) {
      console.error('Chat failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate response');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await ragService.deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Failed to delete document:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete document');
    }
  };

  const handleClearChat = async () => {
    try {
      await ragService.clearChatHistory();
      setChatMessages([]);
    } catch (error) {
      console.error('Failed to clear chat:', error);
      setError(error instanceof Error ? error.message : 'Failed to clear chat');
    }
  };

  if (!initialized && !error) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <div className="privacy-logo">🔒</div>
          <h1>PrivacyThink</h1>
          <p>Initializing privacy-first document analysis...</p>
          {!systemStatus.modelLoaded && <ModelDownloader />}
          {processingProgress && (
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${processingProgress.progress}%` }}
              />
              <span className="progress-text">{processingProgress.message}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <div className="error-container">
          <h2>❌ Initialization Failed</h2>
          <p>{error}</p>
          <button onClick={initializeApp} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🔒</span>
            <h1>PrivacyThink</h1>
          </div>
          
          <nav className="nav-tabs">
            <button 
              className={activeTab === 'chat' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('chat')}
            >
              💬 Chat
            </button>
            <button 
              className={activeTab === 'documents' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('documents')}
            >
              📄 Documents ({documents.length})
            </button>
            <button 
              className={activeTab === 'settings' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ Settings
            </button>
          </nav>

          <SystemStatus status={systemStatus} />
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <main className="app-main">
        {activeTab === 'chat' && (
          <div className="chat-view">
            <div className="chat-sidebar">
              <DocumentUpload 
                onUpload={handleDocumentUpload}
                processing={!!processingProgress}
                progress={processingProgress}
              />
              
              {documents.length > 0 && (
                <div className="document-summary">
                  <h3>📚 Loaded Documents</h3>
                  <ul>
                    {documents.slice(0, 5).map(doc => (
                      <li key={doc.id} title={doc.name}>
                        {doc.name.length > 25 ? `${doc.name.slice(0, 25)}...` : doc.name}
                      </li>
                    ))}
                    {documents.length > 5 && (
                      <li>+ {documents.length - 5} more...</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <ChatInterface 
              messages={chatMessages}
              onSendMessage={handleChatMessage}
              onClearChat={handleClearChat}
              disabled={!systemStatus.modelLoaded}
            />
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentList 
            documents={documents}
            onDelete={handleDeleteDocument}
            onUpload={handleDocumentUpload}
            processing={!!processingProgress}
            progress={processingProgress}
          />
        )}

        {activeTab === 'settings' && (
          <div className="settings-view">
            <PrivacyNotice />
            
            <div className="settings-section">
              <h2>🤖 Model Management</h2>
              <ModelDownloader />
            </div>

            <div className="settings-section">
              <h2>🗑️ Data Management</h2>
              <div className="setting-group">
                <button 
                  onClick={handleClearChat}
                  className="danger-button"
                >
                  Clear Chat History
                </button>
                <button 
                  onClick={async () => {
                    if (window.confirm('Delete ALL documents and data? This cannot be undone.')) {
                      await ragService.deleteAllUserData();
                      setDocuments([]);
                      setChatMessages([]);
                    }
                  }}
                  className="danger-button"
                >
                  Delete All Data
                </button>
                <button 
                  onClick={async () => {
                    const data = await ragService.exportUserData();
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `privacythink-export-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="secondary-button"
                >
                  Export My Data
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          🔒 <strong>Privacy-First:</strong> All processing happens locally on your device. 
          No data ever leaves your computer.
        </p>
      </footer>
    </div>
  );
}

export default App;