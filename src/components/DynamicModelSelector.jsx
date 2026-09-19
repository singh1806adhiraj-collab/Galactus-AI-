/* Galactus AI - Dynamic Model Selector Component */
import { useState, useRef, useEffect, useCallback } from 'react';
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

export default function DynamicModelSelector({
  selectedModel,
  onSelect,
  selectedProvider,
  className = '',
  placeholder = 'Select model'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch models when provider changes
  const fetchModels = useCallback(async () => {
    if (!selectedProvider) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getProviderModels(selectedProvider);
      const newModels = data.models || [];
      setModels(newModels);

      // Auto-select first model if current model doesn't belong to this provider
      if (newModels.length > 0) {
        const currentModelExists = newModels.some(m => m.id === selectedModel);
        if (!currentModelExists) {
          // Trigger model selection for the first valid model
          setTimeout(() => onSelect(newModels[0].id), 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
      setError(err.message);
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProvider, selectedModel, onSelect]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentModel = models.find(m => m.id === selectedModel) || models[0] || { id: selectedModel, name: selectedModel || placeholder, tier: 'fast', tierLabel: '' };

  return (
    <div className={`model-selector ${className}`} ref={dropdownRef}>
      <button
        className={`model-selector-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setTimeout(() => inputRef.current?.focus(), 0);
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select AI model"
        disabled={isLoading && models.length === 0}
      >
        <span className="model-selector-icon" aria-hidden="true">{tierIcons[currentModel.tier] || '🤖'}</span>
        <span className="model-selector-name">{currentModel.name}</span>
        <span className="model-selector-tier">{tierLabels[currentModel.tier] || ''}</span>
        <span className="model-selector-chevron" aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="model-selector-dropdown" role="listbox">
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
              disabled={isLoading}
            />
          </div>
          <div className="model-selector-list" role="listbox">
            {isLoading && models.length === 0 && (
              <div className="model-selector-loading">Loading models...</div>
            )}
            {error && models.length === 0 && (
              <div className="model-selector-error">Failed to load models: {error}</div>
            )}
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
                    <span className="model-item-tier-label">{tierLabels[model.tier] || ''}</span>
                  </div>
                  <div className="model-item-meta">
                    <span className="model-item-context">• {model.context || 'unknown'} context</span>
                  </div>
                </div>
                {model.id === selectedModel && (
                  <span className="model-item-check" aria-hidden="true">✓</span>
                )}
              </button>
            ))}
            {filteredModels.length === 0 && !isLoading && (
              <div className="model-selector-empty">No models found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}