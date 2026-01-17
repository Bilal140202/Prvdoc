import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  onClearChat: () => void;
  disabled: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  disabled
}) => {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || sending || disabled) return;

    const message = input.trim();
    setInput('');
    setSending(true);

    try {
      await onSendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h2>💬 Chat with Your Documents</h2>
        <div className="chat-controls">
          {messages.length > 0 && (
            <button 
              onClick={onClearChat}
              className="clear-chat-button"
              title="Clear conversation"
            >
              🗑️ Clear
            </button>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-icon">🤖</div>
            <h3>Ready to analyze your documents!</h3>
            <p>Upload some documents and ask questions about their content.</p>
            <div className="example-questions">
              <h4>Try asking:</h4>
              <ul>
                <li>"What are the main topics in my documents?"</li>
                <li>"Summarize the key findings"</li>
                <li>"What does the document say about [specific topic]?"</li>
              </ul>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.role}`}
            >
              <div className="message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              
              <div className="message-content">
                <div 
                  className="message-text"
                  dangerouslySetInnerHTML={{ 
                    __html: formatMessage(message.content) 
                  }}
                />
                
                {message.sources && message.sources.length > 0 && (
                  <div className="message-sources">
                    <h4>📚 Sources:</h4>
                    {message.sources.map((source, index) => (
                      <div key={index} className="source">
                        <div className="source-header">
                          <strong>{source.documentName}</strong>
                          {source.page && <span className="page-number">Page {source.page}</span>}
                          <span className="relevance-score">
                            {Math.round(source.relevanceScore * 100)}% relevant
                          </span>
                        </div>
                        <div className="source-content">
                          {source.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="message-timestamp">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        
        {sending && (
          <div className="message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="input-container">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              disabled 
                ? "Please wait for the AI model to load..." 
                : "Ask a question about your documents..."
            }
            disabled={disabled || sending}
            rows={1}
            className="chat-input"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending || disabled}
            className="send-button"
          >
            {sending ? '⏳' : '➤'}
          </button>
        </div>
        
        {disabled && (
          <div className="input-status">
            ⚡ Loading AI model... This may take a few minutes on first use.
          </div>
        )}
      </form>
    </div>
  );
};

export default ChatInterface;