/* Galactus AI - Chat Message Component */
import { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Normalize content before Markdown rendering
// Convert literal <br>, <br/>, <br /> to newlines
function normalizeContent(content) {
  if (!content) return content;
  // Replace <br>, <br/>, <br /> with newlines
  return content.replace(/<br\s*\/?>/gi, '\n');
}

// Custom table wrapper component for horizontal scrolling
function TableWrapper({ children }) {
  return (
    <div className="markdown-table-wrapper" role="region" aria-label="Scrollable table">
      {children}
    </div>
  );
}

const markdownComponents = {
  table: TableWrapper,
};

export default function ChatMessage({ message, isStreaming = false }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const messageRef = useRef(null);
  const normalizedContent = useMemo(() => normalizeContent(message.content), [message.content]);

  return (
    <div
      ref={messageRef}
      className={`chat-message ${message.role} ${isStreaming ? 'streaming' : ''}`}
      data-message-id={message.id}
    >
      <div className="message-bubble">
        <div className="message-content">
          {normalizedContent ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {normalizedContent}
            </ReactMarkdown>
          ) : (
            <div className="message-placeholder">
              <span className="typing-indicator" aria-label="Galactus is thinking">
                <span></span><span></span><span></span>
              </span>
            </div>
          )}
          {isStreaming && <span className="streaming-cursor" aria-hidden="true">▌</span>}
        </div>

        <div className="message-meta">
          <span className="message-time">{message.timestamp}</span>
          <div className="message-actions">
            <button
              className="icon-btn-sm"
              aria-label="Copy message"
              title="Copy"
              onClick={() => navigator.clipboard.writeText(message.content || '')}
            >
              <span aria-hidden="true">📋</span>
            </button>
            {message.role === 'assistant' && (
              <button
                className="icon-btn-sm"
                aria-label="Regenerate response"
                title="Regenerate"
              >
                <span aria-hidden="true">🔄</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}