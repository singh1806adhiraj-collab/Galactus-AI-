/* Galactus AI - Chat Message Component */
import { useState, useRef, useEffect } from 'react';

export default function ChatMessage({ message, isStreaming = false }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const messageRef = useRef(null);

  const formatContent = (content) => {
    if (!content) return null;

    // Split by code blocks first
    const parts = content.split(/(\n?```[\s\S]*?```\n?)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const lines = part.split('\n');
        const language = lines[0].replace('```', '').trim() || 'text';
        const code = lines.slice(1, -1).join('\n');
        return <CodeBlock key={index} language={language} code={code} />;
      }

      if (!part.trim()) return null;

      // Handle inline code and regular text
      return (
        <div key={index} className="message-paragraph">
          {part.split(/(`[^`]+`)/g).map((segment, segIndex) => {
            if (segment.startsWith('`') && segment.endsWith('`')) {
              return <code key={segIndex}>{segment.slice(1, -1)}</code>;
            }
            return segment;
          })}
        </div>
      );
    });
  };

  return (
    <div
      ref={messageRef}
      className={`chat-message ${message.role} ${isStreaming ? 'streaming' : ''}`}
      data-message-id={message.id}
    >
      <div className="message-bubble">
        <div className="message-content">
          {message.content ? formatContent(message.content) : (
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

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-language">{language}</span>
        <button
          className="code-copy-btn"
          onClick={handleCopy}
          aria-label={copied ? 'Copied!' : 'Copy code'}
          title={copied ? 'Copied!' : 'Copy'}
        >
          <span aria-hidden="true">{copied ? '✓' : '📋'}</span>
        </button>
      </div>
      <pre><code className={`language-${language}`}>{code}</code></pre>
    </div>
  );
}