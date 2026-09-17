/* Galactus AI - Provider/Combo Selector Component */
import { useState, useRef, useEffect } from 'react';

const providers = [
  { id: 'openai', name: 'OpenAI', status: 'healthy', models: 12, color: '#00A67E' },
  { id: 'anthropic', name: 'Anthropic', status: 'healthy', models: 8, color: '#D97757' },
  { id: 'google', name: 'Google', status: 'healthy', models: 15, color: '#4285F4' },
  { id: 'deepseek', name: 'DeepSeek', status: 'degraded', models: 6, color: '#FF6B35' },
  { id: 'openrouter', name: 'OpenRouter', status: 'healthy', models: 200, color: '#6366F1' },
];

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
};

const statusLabels = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
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
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
              style={{ backgroundColor: statusColors[currentProvider.status] }}
              aria-label={`${currentProvider.name} is ${statusLabels[currentProvider.status]}`}
            />
            <span className="selector-name">{currentProvider.name}</span>
          </>
        ) : (
          <>
            <span className="selector-combo-icon" aria-hidden="true">🔗</span>
            <span className="selector-name">{currentCombo.name}</span>
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
                  className={`selector-item ${provider.id === selectedProvider ? 'selected' : ''}`}
                  role="option"
                  aria-selected={provider.id === selectedProvider}
                  onClick={() => {
                    onSelectProvider(provider.id);
                    setIsOpen(false);
                  }}
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
                      <span className="provider-models">• {provider.models} models</span>
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
              {combos.map((combo) => (
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