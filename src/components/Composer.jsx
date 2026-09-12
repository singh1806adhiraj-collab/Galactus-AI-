/* Galactus AI - Composer Component */
import { useState, useRef, useEffect } from 'react';
import ModelSelector from './ModelSelector.jsx';
import ProviderComboSelector from './ProviderComboSelector.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

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
  const [modelProviders, setModelProviders] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedCombo, setSelectedCombo] = useState('flagship-fallback');
  const { isAuthenticated, user } = useAuth();

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

  // Load provider metadata
  useEffect(() => {
    async function loadProviders() {
      try {
        const data = await api.getProviderMetadata();
        setModelProviders(data.providers);
      } catch (error) {
        console.error('Failed to load provider metadata:', error);
      }
    }
    loadProviders();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !isStreaming && !disabled) {
      onSend(text.trim(), {
        provider: selectedProvider,
        model: selectedModel || undefined,
        combo: selectedCombo,
      });
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

  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
  };

  const handleProviderSelect = (providerId) => {
    setSelectedProvider(providerId);
    // Reset model when provider changes so it can be re-fetched
    setSelectedModel('');
  };

  const handleComboSelect = (comboId) => {
    setSelectedCombo(comboId);
  };

  return (
    <form className="composer" onSubmit={handleSubmit}>
      {/* Model/Provider Controls Row - above the main input */}
      <div className="composer-controls-row">
        <div className="composer-controls-left">
          <ModelSelector
            selectedModel={selectedModel}
            onSelect={handleModelSelect}
            className="composer-model-selector"
            placeholder="Select model"
            provider={selectedProvider}
          />
          <ProviderComboSelector
            selectedProvider={selectedProvider}
            onSelectProvider={handleProviderSelect}
            selectedCombo={selectedCombo}
            onSelectCombo={handleComboSelect}
            className="composer-provider-selector"
          />
        </div>
        <div className="composer-controls-right">
          <div className="attach-menu-wrapper" ref={attachMenuRef}>
            <button
              type="button"
              className="composer-control-btn attachment-btn"
              onClick={handleAttachClick}
              disabled={disabled || isStreaming}
              aria-label="Attach files"
              aria-expanded={showAttachMenu}
              aria-haspopup="menu"
              title="Attach files"
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
        </div>
      </div>

      {/* Main Input Area - large rounded container */}
      <div className="composer-main-input">
        <div className="composer-input-wrapper">
          <button
            type="button"
            className="composer-input-btn attach-btn"
            onClick={handleAttachClick}
            disabled={disabled || isStreaming}
            aria-label="Attach files"
            title="Attach"
          >
            <span aria-hidden="true">+</span>
          </button>
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
          <button
            type="button"
            className="composer-input-btn voice-btn"
            disabled={disabled || isStreaming || !text.trim()}
            aria-label="Voice input"
            title="Voice"
          >
            <span aria-hidden="true">🎤</span>
          </button>
        </div>
        <div className="composer-send-wrapper">
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