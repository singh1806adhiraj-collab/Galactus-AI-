/* Galactus AI - Composer Component */
import { useState, useRef, useEffect } from 'react';
import ModelSelector from './ModelSelector.jsx';
import ProviderComboSelector from './ProviderComboSelector.jsx';

export default function Composer({
  onSend,
  onStop,
  onAttachFiles,
  onNewChat,
  isStreaming = false,
  disabled = false,
  placeholder = 'Message Galactus...'
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const [height, setHeight] = useState(56);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const attachMenuRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 280);
      setHeight(newHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [text]);

  // Handle click outside attach menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) {
        setShowAttachMenu(false);
      }
    }
    if (showAttachMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachMenu]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !isStreaming && !disabled) {
      onSend(text.trim());
      setText('');
      setHeight(56);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleAttachClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAttachMenu(!showAttachMenu);
  };

  return (
    <form className="composer" onSubmit={handleSubmit}>
      {/* Top bar with model/provider selectors */}
      <div className="composer-toolbar">
        <div className="composer-left">
          <ModelSelector
            selectedModel="gpt-4o"
            onSelect={() => {}}
            className="composer-model-selector"
            placeholder="Select model"
          />
          <ProviderComboSelector
            selectedProvider="openai"
            onSelectProvider={() => {}}
            selectedCombo="flagship-fallback"
            onSelectCombo={() => {}}
            className="composer-provider-selector"
          />
        </div>
        <div className="composer-right">
          <div className="attach-menu-wrapper" ref={attachMenuRef}>
            <button
              type="button"
              className="composer-btn attachment-btn"
              onClick={handleAttachClick}
              disabled={disabled || isStreaming}
              aria-label="Attach files"
              aria-expanded={showAttachMenu}
              aria-haspopup="menu"
              title="Attach files (Ctrl+U)"
            >
              <span aria-hidden="true">📎</span>
            </button>
            {showAttachMenu && (
              <div className="attach-menu" role="menu">
                <button className="attach-menu-item" role="menuitem">
                  <span aria-hidden="true">📁</span> Upload File
                </button>
                <button className="attach-menu-item" role="menuitem">
                  <span aria-hidden="true">📷</span> Upload Image
                </button>
                <button className="attach-menu-item" role="menuitem">
                  <span aria-hidden="true">💻</span> Code Snippet
                </button>
                <button className="attach-menu-item" role="menuitem">
                  <span aria-hidden="true">📂</span> Folder
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="composer-btn new-chat-btn"
            onClick={onNewChat}
            disabled={disabled || isStreaming}
            aria-label="New conversation"
            title="New Chat (Ctrl+N)"
          >
            <span aria-hidden="true">➕</span>
          </button>
        </div>
      </div>

      {/* Main input area */}
      <div className="composer-input-wrapper">
        <textarea
          ref={textareaRef}
          className="composer-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isStreaming}
          rows={1}
          style={{ height: `${height}px` }}
          aria-label="Message input"
          spellCheck="true"
        />
      </div>

      {/* Bottom bar with send/stop */}
      <div className="composer-footer">
        <div className="composer-hints">
          <kbd>Enter</kbd> Send · <kbd>Shift+Enter</kbd> New line · <kbd>Ctrl+U</kbd> Attach · <kbd>Ctrl+N</kbd> New chat
        </div>
        <div className="composer-actions">
          {isStreaming ? (
            <button
              type="button"
              className="composer-btn stop-btn"
              onClick={onStop}
              aria-label="Stop generation"
              title="Stop (Esc)"
            >
              <span aria-hidden="true">⏹</span>
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              className="composer-btn send-btn"
              disabled={!text.trim() || disabled}
              aria-label="Send message"
              title="Send (Enter)"
            >
              <span aria-hidden="true">➤</span>
            </button>
          )}
        </div>
      </div>
    </form>
  );
}