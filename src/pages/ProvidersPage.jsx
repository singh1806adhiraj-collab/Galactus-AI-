/* Galactus AI - Providers Page */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ProviderModal from '../components/ProviderModal.jsx';
import api from '../services/api.js';
import { getProviderMetadata, getAllProvidersMetadata } from '../providers/index.js';
import '../styles/providers.css';

/**
 * Fixed provider display order as specified
 */
const PROVIDER_DISPLAY_ORDER = [
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'openrouter',
  'mistral',
  'xai',
  'groq',
];

export default function ProvidersPage() {
  const { isAuthenticated, isGuest } = useAuth();
  const [providers, setProviders] = useState([]);
  const [providerMetadata, setProviderMetadata] = useState({});
  const [providerHealth, setProviderHealth] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [testingProvider, setTestingProvider] = useState(null);

  const checkProviderHealth = useCallback(async (providerId) => {
    try {
      const health = await api.getProviderHealth(providerId);
      setProviderHealth(prev => ({ ...prev, [providerId]: health }));
    } catch (error) {
      setProviderHealth(prev => ({ ...prev, [providerId]: { status: 'unhealthy', message: error.message } }));
    }
  }, []);

  const loadProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load provider metadata (merge API metadata with frontend icons)
      const metadataData = await api.getProviderMetadata();
      const metadataObj = metadataData.providers.reduce((acc, p) => {
        acc[p.id] = { ...getProviderMetadata(p.id), ...p };
        return acc;
      }, {});
      setProviderMetadata(metadataObj);

      // Load user's configured providers
      const providersData = await api.getUserProviders();
      setProviders(providersData.providers);

      // Check health for configured providers
      const configuredProviders = providersData.providers.filter(p => p.enabled !== false);
      for (const p of configuredProviders) {
        checkProviderHealth(p.provider);
      }
    } catch (error) {
      setError(error.message || 'Failed to load providers');
    } finally {
      setIsLoading(false);
    }
  }, [checkProviderHealth]);

  // Load on mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      loadProviders();
    }
  }, [isAuthenticated, loadProviders]);

  // Handle provider test
  const handleTestConnection = useCallback(async (providerId, apiKey) => {
    try {
      const result = await api.testProviderConnection(providerId, apiKey);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const handleTestFromCard = useCallback(async (providerId) => {
    setTestingProvider(providerId);
    try {
      const result = await handleTestConnection(providerId);
      return result;
    } finally {
      setTestingProvider(null);
    }
  }, [handleTestConnection]);

  const handleToggleProvider = useCallback(async (providerId, enabled) => {
    try {
      await api.toggleProvider(providerId, enabled);
      await loadProviders();
    } catch (error) {
      throw error;
    }
  }, [loadProviders]);

  const handleRemoveProvider = useCallback(async (providerId) => {
    if (!window.confirm('Remove this provider? This cannot be undone.')) return;
    try {
      await api.deleteProvider(providerId);
      await loadProviders();
    } catch (error) {
      throw error;
    }
  }, [loadProviders]);

  const handleEditProvider = useCallback((provider) => {
    setEditingProvider(provider);
    setModalOpen(true);
  }, []);

  const handleAddProvider = useCallback(() => {
    setEditingProvider(null);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingProvider(null);
  }, []);

  const handleProviderSave = useCallback(async (providerId, apiKey, enabled) => {
    try {
      await api.saveProviderConfig(providerId, { apiKey }, enabled);
      await loadProviders();
      setModalOpen(false);
      setEditingProvider(null);
    } catch (error) {
      throw error;
    }
  }, [loadProviders]);

  // Not authenticated / Guest states
  if (!isAuthenticated) {
    return (
      <div className="providers-page">
        <div className="providers-header">
          <h1>AI Providers</h1>
          <p className="page-description">Connect and manage the AI providers available to Galactus AI.</p>
        </div>
        <div className="page-error" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>Please sign in to manage your AI providers.</span>
        </div>
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="providers-page">
        <div className="providers-header">
          <h1>AI Providers</h1>
          <p className="page-description">Connect and manage the AI providers available to Galactus AI.</p>
        </div>
        <div className="page-error" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>Guest mode: Provider management is not available. Please sign in to configure providers.</span>
        </div>
      </div>
    );
  }

  // Compute stats from actual application state
  const stats = useMemo(() => {
    const healthy = providers.filter(p => {
      const health = providerHealth[p.provider];
      return p.enabled !== false && health && health.status === 'healthy';
    }).length;
    const configured = providers.length;
    const total = PROVIDER_DISPLAY_ORDER.length;
    return { connected: healthy, available: configured, total };
  }, [providers, providerHealth]);

  // Create ordered provider list for display
  const orderedProviders = useMemo(() => {
    const allMetadata = getAllProvidersMetadata();
    const metadataMap = Object.fromEntries(allMetadata.map(m => [m.id, m]));

    return PROVIDER_DISPLAY_ORDER.map(id => {
      const metadata = metadataMap[id];
      const provider = providers.find(p => p.provider === id);
      const isConfigured = !!provider;
      const isEnabled = isConfigured && provider.enabled !== false;
      const health = providerHealth[id];
      const isHealthy = health && health.status === 'healthy';

      // A provider is "connected" only if configured, enabled, AND health check passes
      const isConnected = isConfigured && isEnabled && isHealthy;

      return {
        id,
        metadata,
        provider,
        isConfigured,
        isEnabled,
        isHealthy,
        isConnected,
        health,
        status: isConfigured ? (isEnabled ? (isHealthy ? 'connected' : 'degraded') : 'disabled') : 'not_connected',
      };
    });
  }, [providers, providerHealth]);

  // Loading state
  if (isLoading) {
    return (
      <div className="providers-page">
        <div className="providers-header">
          <h1>AI Providers</h1>
          <p className="page-description">Connect and manage the AI providers available to Galactus AI.</p>
        </div>
        <div className="providers-grid">
          {PROVIDER_DISPLAY_ORDER.map((id, index) => (
            <div key={id} className="provider-card loading">
              <div className="provider-skeleton skeleton-icon"></div>
              <div>
                <div className="provider-skeleton skeleton-title"></div>
                <div className="provider-skeleton skeleton-desc"></div>
                <div className="provider-skeleton skeleton-status"></div>
                <div className="provider-skeleton skeleton-btn"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="providers-page">
        <div className="providers-header">
          <h1>AI Providers</h1>
          <p className="page-description">Connect and manage the AI providers available to Galactus AI.</p>
        </div>
        <div className="page-error" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="providers-page">
      {/* Header */}
      <header className="providers-header">
        <h1>AI Providers</h1>
        <p className="page-description">Connect and manage the AI providers available to Galactus AI.</p>
      </header>

      {/* Stats Summary */}
      <div className="providers-stats" role="region" aria-label="Provider statistics">
        <div className="stat-item">
          <span className="stat-label">Connected</span>
          <span className="stat-value connected">{stats.connected}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Configured</span>
          <span className="stat-value available">{stats.available}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Providers</span>
          <span className="stat-value total">{stats.total}</span>
        </div>
      </div>

      {/* Provider Grid */}
      <div className="providers-grid" role="list" aria-label="AI Providers">
        {orderedProviders.map(({ id, metadata, provider, isConfigured, isEnabled, isHealthy, isConnected, health, status }) => {
          const isTesting = testingProvider === id;

          // Determine card status for styling
          const cardStatus = isConnected ? 'connected' : (isConfigured ? (isEnabled ? 'degraded' : 'disabled') : 'not_connected');
          const displayStatus = isTesting ? 'testing' : (isConfigured ? (isEnabled ? (isHealthy ? 'connected' : 'degraded') : 'disabled') : 'not_connected');

          return (
            <article
              key={id}
              className={`provider-card ${cardStatus}`}
              role="listitem"
            >
              {/* Icon */}
              <div className="provider-icon-wrapper" aria-hidden="true">
                {metadata.icon && metadata.icon.startsWith('/') ? (
                  <img
                    src={metadata.icon}
                    alt=""
                    className="provider-icon"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span
                  className="provider-icon-fallback"
                  style={{
                    display: metadata.icon && metadata.icon.startsWith('/') ? 'none' : 'flex'
                  }}
                >
                  {metadata.iconFallback || metadata.icon || '🤖'}
                </span>
              </div>

              {/* Content */}
              <div className="provider-content">
                <div className="provider-header">
                  <div className="provider-info">
                    <h3 className="provider-name">{metadata.name}</h3>
                    <p className="provider-description">{metadata.description}</p>
                  </div>
                  <span
                    className={`provider-status ${displayStatus}`}
                    aria-live="polite"
                    aria-label={isConfigured ? (isEnabled ? (isHealthy ? 'Connected' : 'Degraded') : 'Disabled') : 'Not Configured'}
                  >
                    <span className="status-dot" aria-hidden="true"></span>
                    {isTesting ? 'Testing' : isConfigured ? (isEnabled ? (isHealthy ? 'Connected' : 'Degraded') : 'Disabled') : 'Not Connected'}
                  </span>
                </div>

                {/* Actions */}
                <div className="provider-actions" role="group" aria-label={`${metadata.name} actions`}>
                  {isConfigured ? (
                    <>
                      <button
                        type="button"
                        className="provider-btn provider-btn-secondary provider-btn-sm"
                        onClick={() => handleTestFromCard(id)}
                        disabled={isTesting}
                        aria-label={isTesting ? 'Testing connection...' : `Test ${metadata.name} connection`}
                      >
                        {isTesting ? (
                          <>
                            <span className="spinner-small" aria-hidden="true"></span>
                            Testing...
                          </>
                        ) : (
                          'Test Connection'
                        )}
                      </button>
                      <button
                        type="button"
                        className="provider-btn provider-btn-ghost provider-btn-sm"
                        onClick={() => handleEditProvider(provider)}
                        disabled={isTesting}
                        aria-label={`Manage ${metadata.name} configuration`}
                      >
                        Manage
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="provider-btn provider-btn-primary provider-btn-sm"
                      onClick={handleAddProvider}
                      aria-label={`Connect ${metadata.name}`}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Empty state fallback (shouldn't happen with fixed providers) */}
      {orderedProviders.length === 0 && (
        <div className="providers-empty">
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">🔌</span>
            <h3>No providers configured</h3>
            <p>Add your first AI provider to get started</p>
            <button className="provider-btn provider-btn-primary" onClick={handleAddProvider}>
              <span aria-hidden="true">➕</span>
              Add Provider
            </button>
          </div>
        </div>
      )}

      {/* Provider Modal */}
      <ProviderModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        providerToEdit={editingProvider}
        onSave={handleProviderSave}
        onTestConnection={handleTestConnection}
      />
    </div>
  );
}