/* Galactus AI - Model Selector Component */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api.js';

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

// Provider-specific default models
const PROVIDER_DEFAULT_MODELS = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', context: '128k', tier: 'flagship', tierLabel: 'Best for complex tasks' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', context: '128k', tier: 'fast', tierLabel: 'Fast & cost-effective' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', context: '128k', tier: 'flagship', tierLabel: 'Best for complex tasks' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', context: '16k', tier: 'fast', tierLabel: 'Fast & cost-effective' },
  ],
  anthropic: [
    { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', context: '200k', tier: 'flagship', tierLabel: 'Best for coding' },
    { id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', context: '200k', tier: 'fast', tierLabel: 'Fast & efficient' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', context: '200k', tier: 'flagship', tierLabel: 'Best for complex tasks' },
    { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', context: '200k', tier: 'fast', tierLabel: 'Fast & efficient' },
  ],
  google: [
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', context: '2M', tier: 'flagship', tierLabel: 'Massive context' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google', context: '1M', tier: 'fast', tierLabel: 'Fast with large context' },
    { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', provider: 'Google', context: '32k', tier: 'fast', tierLabel: 'Fast with large context' },
  ],
  deepseek: [
    { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek', context: '128k', tier: 'flagship', tierLabel: 'Strong reasoning' },
    { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', context: '128k', tier: 'reasoning', tierLabel: 'Reasoning model' },
  ],
  openrouter: [
    { id: 'openai/gpt-4o', name: 'GPT-4o (OpenRouter)', provider: 'OpenRouter', context: '128k', tier: 'flagship', tierLabel: 'Best for complex tasks' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (OpenRouter)', provider: 'OpenRouter', context: '128k', tier: 'fast', tierLabel: 'Fast & cost-effective' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (OpenRouter)', provider: 'OpenRouter', context: '200k', tier: 'flagship', tierLabel: 'Best for coding' },
    { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku (OpenRouter)', provider: 'OpenRouter', context: '200k', tier: 'fast', tierLabel: 'Fast & efficient' },
    { id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro (OpenRouter)', provider: 'OpenRouter', context: '2M', tier: 'flagship', tierLabel: 'Massive context' },
    { id: 'google/gemini-1.5-flash', name: 'Gemini 1.5 Flash (OpenRouter)', provider: 'OpenRouter', context: '1M', tier: 'fast', tierLabel: 'Fast with large context' },
  ],
  mistral: [
    { id: 'mistral-large-latest', name: 'Mistral Large', provider: 'Mistral', context: '128k', tier: 'flagship', tierLabel: 'Best for complex tasks' },
    { id: 'mistral-small-latest', name: 'Mistral Small', provider: 'Mistral', context: '32k', tier: 'fast', tierLabel: 'Fast & cost-effective' },
    { id: 'codestral-latest', name: 'Codestral', provider: 'Mistral', context: '32k', tier: 'coding', tierLabel: 'Optimized for coding' },
  ],
  xai: [
    { id: 'grok-beta', name: 'Grok Beta', provider: 'Grok', context: '128k', tier: 'flagship', tierLabel: 'Best for complex tasks' },
    { id: 'grok-2', name: 'Grok 2', provider: 'Grok', context: '128k', tier: 'flagship', tierLabel: 'Best for complex tasks' },
    { id: 'grok-2-mini', name: 'Grok 2 Mini', provider: 'Grok', context: '128k', tier: 'fast', tierLabel: 'Fast & efficient' },
  ],
  groq: [
    { id: 'llama-3.1-405b', name: 'Llama 3.1 405B', provider: 'Groq', context: '128k', tier: 'flagship', tierLabel: 'Best for complex tasks' },
    { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', provider: 'Groq', context: '128k', tier: 'flagship', tierLabel: 'Best for complex tasks' },
    { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', provider: 'Groq', context: '128k', tier: 'fast', tierLabel: 'Fast & efficient' },
  ],
};

function getDefaultModelsForProvider(provider) {
  return PROVIDER_DEFAULT_MODELS[provider] || PROVIDER_DEFAULT_MODELS.openai;
}

function ModelSelectorDropdown({ isOpen, searchQuery, setSearchQuery, filteredModels, selectedModel, onSelect, setIsOpen, inputRef, dropdownRef, triggerRect }) {
  if (!isOpen || !triggerRect) return null;

  const dropdownStyle = {
    position: 'fixed',
    top: `${triggerRect.bottom + 8}px`,
    left: `${triggerRect.left}px`,
    minWidth: '300px',
    maxWidth: '380px',
    zIndex: 9999,
  };

  return createPortal(
    <div
      ref={dropdownRef}
      className="model-selector-dropdown"
      role="listbox"
      style={dropdownStyle}
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

export default function ModelSelector({
  selectedModel,
  onSelect,
  className = '',
  placeholder = 'Select model',
  provider = 'openai'  // Provider to fetch models for
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [triggerRect, setTriggerRect] = useState(null);
  const [models, setModels] = useState(() => getDefaultModelsForProvider(provider));
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);

  const updateTriggerRect = useCallback(() => {
    if (triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect());
    }
  }, []);

  // Fetch models for the selected provider
  useEffect(() => {
    let cancelled = false;

    async function fetchModels() {
      setIsLoadingModels(true);
      try {
        const data = await api.getProviderModels(provider);
        if (!cancelled && data.models) {
          setModels(data.models);
        }
      } catch (error) {
        console.warn('Failed to fetch models for provider:', provider, error);
        // Keep provider-specific default models as fallback
        if (!cancelled) {
          setModels(getDefaultModelsForProvider(provider));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingModels(false);
        }
      }
    }

    fetchModels();

    return () => {
      cancelled = true;
    };
  }, [provider]);

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

  // Update trigger rect on scroll/resize when open
  useEffect(() => {
    if (!isOpen) return;
    updateTriggerRect();
    window.addEventListener('scroll', updateTriggerRect, true);
    window.addEventListener('resize', updateTriggerRect);
    return () => {
      window.removeEventListener('scroll', updateTriggerRect, true);
      window.removeEventListener('resize', updateTriggerRect);
    };
  }, [isOpen, updateTriggerRect]);

  const filteredModels = useMemo(() =>
    models.filter(model =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.provider.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [models, searchQuery]
  );

  const currentModel = useMemo(() => {
    // If we have a selected model but it's not in the list yet,
    // return a temporary object to show it's loading
    if (selectedModel && !models.find(m => m.id === selectedModel)) {
      return { id: selectedModel, name: selectedModel, tier: 'flagship', tierLabel: 'Loading...' };
    }
    return models.find(m => m.id === selectedModel) || models[0];
  }, [models, selectedModel]);

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (newIsOpen) {
      // Update rect immediately when opening
      setTimeout(() => {
        updateTriggerRect();
        inputRef.current?.focus();
      }, 0);
    }
  };

  return (
    <div className={`model-selector ${className}`} ref={triggerRef}>
      <button
        type="button"
        className={`model-selector-trigger ${isOpen ? 'open' : ''}`}
        onClick={handleToggle}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIsOpen(true);
            setTimeout(() => {
              updateTriggerRect();
              inputRef.current?.focus();
            }, 0);
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
        triggerRect={triggerRect}
      />
    </div>
  );
}