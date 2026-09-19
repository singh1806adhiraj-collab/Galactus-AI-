/* Galactus AI - Provider/Combo Selector Component */
import { useState, useRef, useEffect } from 'react';
import api from '../services/api.js';
import { getAllProvidersMetadata } from '../../providers/index.js';

const combos = [
  { id: 'flagship-fallback', name: 'Flagship Fallback', models: ['gpt-4o', 'claude-3.5-sonnet', 'gemini-1.5-pro'], priority: 'Quality First', description: 'Best models with automatic failover' },
  { id: 'speed-combo', name: 'Speed Combo', models: ['gpt-4o-mini', 'claude-3.5-haiku', 'gemini-1.5-flash'], priority: 'Speed First', description: 'Fastest responses for quick tasks' },
  { id: 'reasoning-combo', name: 'Reasoning Combo', models: ['deepseek-r1', 'gpt-4o', 'claude-3.5-sonnet'], priority: 'Reasoning First', description: 'Optimized for complex problem solving' },
  { id: 'cost-combo', name: 'Cost Optimized', models: ['gpt-4o-mini', 'gemini-1.5-flash', 'deepseek-v3'], priority: 'Cost First', description: 'Most cost-effective for volume' },
];

const statusColors = {
  healthy: 'var(--color-success)',
  degraded: 'var(--color-warning)',
  down: 'var(--color-error)',
  not_configured: 'var(--color-text-tertiary)',
};

const statusLabels = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
  not_configured: 'Not Connected',
};

export default function ProviderComboSelector({
  selectedProvider,
  onSelectProvider,
  selectedCombo,
  onSelectCombo,
  className = ''
}) {
  const [activeTab, setActiveTab] = useState('providers');
  const [isOpen, setIsOpen] = useState(false);
  const [userProviders, setUserProviders] = useState([]);
  const dropdownRef = useRef(null);

  // Load all provider metadata from registry
  const allProvidersMetadata = getAllProvidersMetadata();

  // Load user's configured providers
  useEffect(() => {
    async function loadUserProviders() {
      try {
        const data = await api.getUserProviders();
        setUserProviders(data.providers);
      } catch (error) {
        console.error('Failed to load user providers:', error);
        setUserProviders([]);
      }
    }
    loadUserProviders();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Map all providers with their connection status from user's config
  const providers = allProvidersMetadata.map(meta => {
    const userConfig = userProviders.find(p => p.provider === meta.id);
    return {
      id: meta.id,
      name: meta.name,
      color: meta.color,
      icon: meta.icon,
      iconFallback: meta.iconFallback,
      description: meta.description,
      requiresApiKey: meta.requiresApiKey,
      status: userConfig ? (userConfig.enabled ? 'healthy' : 'disabled') : 'not_configured',
      connected: !!userConfig && userConfig.enabled,
    };
  });

  // Filter combos to only show those with available providers
  const availableComboIds = new Set(providers.filter(p => p.connected).map(p => p.id));
  const availableCombos = combos.filter(combo =>
    combo.models.some(modelId => {
      const providerId = modelId.split('/')[0];
      return availableComboIds.has(providerId);
    })
  );

  const currentProvider = providers.find(p => p.id === selectedProvider) || providers[0];
  const currentCombo = combos.find(c => c.id === selectedCombo) || combos[0];

  return (
    <div className={`provider-combo-selector ${className}`} ref={dropdownRef}>
      <div className="selector-tabs" role="tablist">
        <button
          role="tab"
          className={`selector-tab ${activeTab === 'providers' ? 'active' : ''}`}
          onClick={() => setActiveTab('providers')}
          aria-selected={activeTab === 'providers'}
          aria-controls="providers-panel"
          id="providers-tab"
        >
          Providers
        </button>
        <button
          role="tab"
          className={`selector-tab ${activeTab === 'combos' ? 'active' : ''}`}
          onClick={() => setActiveTab('combos')}
          aria-selected={activeTab === 'combos'}
          aria-controls="combos-panel"
          id="combos-tab"
        >
          Combos
        </button>
      </div>

      <button
        className={`selector-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={activeTab === 'providers' ? 'Select provider' : 'Select combo'}
      >
        {activeTab === 'providers' ? (
          <>
            <span
              className="selector-status-dot"
              style={{ backgroundColor: statusColors[currentProvider?.status || 'not_configured'] }}
              aria-label={`${currentProvider?.name || 'Provider'} is ${statusLabels[currentProvider?.status || 'not_configured']}`}
            />
            <span className="selector-name">{currentProvider?.name || 'Select Provider'}</span>
          </>
        ) : (
          <>
            <span className="selector-combo-icon" aria-hidden="true">🔗</span>
            <span className="selector-name">{currentCombo?.name || 'Select Combo'}</span>
          </>
        )}
        <span className="selector-chevron" aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="selector-dropdown" role="listbox">
          {activeTab === 'providers' ? (
            <div className="selector-list" id="providers-panel" role="tabpanel" aria-labelledby="providers-tab">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  className={`selector-item ${provider.id === selectedProvider ? 'selected' : ''} ${!provider.connected ? 'disabled' : ''}`}
                  role="option"
                  aria-selected={provider.id === selectedProvider}
                  aria-disabled={!provider.connected}
                  onClick={() => {
                    if (provider.connected) {
                      onSelectProvider(provider.id);
                      setIsOpen(false);
                    }
                  }}
                  disabled={!provider.connected}
                >
                  <div className="provider-item-info">
                    <div className="provider-item-header">
                      <span
                        className="provider-status-dot"
                        style={{ backgroundColor: statusColors[provider.status] }}
                        aria-hidden="true"
                      />
                      <span className="provider-item-name">{provider.name}</span>
                    </div>
                    <div className="provider-item-meta">
                      <span className={`provider-status ${provider.status}`}>{statusLabels[provider.status]}</span>
                    </div>
                  </div>
                  {provider.id === selectedProvider && (
                    <span className="selector-item-check" aria-hidden="true">✓</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="selector-list" id="combos-panel" role="tabpanel" aria-labelledby="combos-tab">
              {availableCombos.map((combo) => (
                <button
                  key={combo.id}
                  className={`selector-item ${combo.id === selectedCombo ? 'selected' : ''}`}
                  role="option"
                  aria-selected={combo.id === selectedCombo}
                  onClick={() => {
                    onSelectCombo(combo.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="combo-item-info">
                    <div className="combo-item-header">
                      <span className="combo-item-name">{combo.name}</span>
                      <span className="combo-priority">{combo.priority}</span>
                    </div>
                    <div className="combo-item-desc">{combo.description}</div>
                    <div className="combo-item-models">
                      {combo.models.map((m, i) => (
                        <span key={m} className="combo-model-tag">
                          {m}{i < combo.models.length - 1 ? ' → ' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                  {combo.id === selectedCombo && (
                    <span className="selector-item-check" aria-hidden="true">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}