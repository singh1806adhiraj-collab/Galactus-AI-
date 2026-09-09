/* Galactus AI - Model Selector Component */
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const models = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', context: '128k', tier: 'flagship', tierLabel: 'Best for complex tasks' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', context: '128k', tier: 'fast', tierLabel: 'Fast & cost-effective' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', context: '200k', tier: 'flagship', tierLabel: 'Best for coding' },
  { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', context: '200k', tier: 'fast', tierLabel: 'Fast & efficient' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', context: '2M', tier: 'flagship', tierLabel: 'Massive context' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google', context: '1M', tier: 'fast', tierLabel: 'Fast with large context' },
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek', context: '128k', tier: 'flagship', tierLabel: 'Strong reasoning' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', context: '128k', tier: 'reasoning', tierLabel: 'Reasoning model' },
];

const tierIcons = {
  flagship: '⭐',
  fast: '⚡',
  reasoning: '🧠',
};

const tierLabels = {
  flagship: 'Flagship',
  fast: 'Fast',
  reasoning: 'Reasoning',
};

function ModelSelectorDropdown({ isOpen, searchQuery, setSearchQuery, filteredModels, selectedModel, onSelect, setIsOpen, inputRef, dropdownRef }) {
  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className="model-selector-dropdown"
      role="listbox"
      style={{ zIndex: 9999 }}
    >
      <div className="model-selector-search">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search models..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
          aria-label="Search models"
        />
      </div>
      <div className="model-selector-list" role="listbox">
        {filteredModels.map((model) => (
          <button
            key={model.id}
            className={`model-selector-item ${model.id === selectedModel ? 'selected' : ''}`}
            role="option"
            aria-selected={model.id === selectedModel}
            onClick={() => {
              onSelect(model.id);
              setIsOpen(false);
              setSearchQuery('');
            }}
          >
            <div className="model-item-info">
              <div className="model-item-header">
                <span className={`model-item-tier ${model.tier}`} aria-hidden="true">
                  {tierIcons[model.tier] || '🤖'}
                </span>
                <span className="model-item-name">{model.name}</span>
                <span className="model-item-tier-label">{tierLabels[model.tier]}</span>
              </div>
              <div className="model-item-meta">
                <span className="model-item-provider">{model.provider}</span>
                <span className="model-item-context">• {model.context} context</span>
              </div>
              <div className="model-item-desc">{model.tierLabel}</div>
            </div>
            {model.id === selectedModel && (
              <span className="model-item-check" aria-hidden="true">✓</span>
            )}
          </button>
        ))}
        {filteredModels.length === 0 && (
          <div className="model-selector-empty">No models found</div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function ModelSelector({ selectedModel, onSelect, className = '', placeholder = 'Select model' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (triggerRef.current && !triggerRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentModel = models.find(m => m.id === selectedModel) || models[0];

  return (
    <div className={`model-selector ${className}`} ref={triggerRef}>
      <button
        type="button"
        className={`model-selector-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setTimeout(() => inputRef.current?.focus(), 0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select AI model"
      >
        <span className="model-selector-icon" aria-hidden="true">{tierIcons[currentModel.tier] || '🤖'}</span>
        <span className="model-selector-name">{currentModel.name}</span>
        <span className="model-selector-tier">{tierLabels[currentModel.tier]}</span>
        <span className="model-selector-chevron" aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
      </button>

      <ModelSelectorDropdown
        isOpen={isOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredModels={filteredModels}
        selectedModel={selectedModel}
        onSelect={onSelect}
        setIsOpen={setIsOpen}
        inputRef={inputRef}
        dropdownRef={dropdownRef}
      />
    </div>
  );
}