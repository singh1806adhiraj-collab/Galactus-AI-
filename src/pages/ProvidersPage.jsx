/* Galactus AI - Providers Page */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ProviderCard from '../components/ProviderCard.jsx';
import ProviderModal from '../components/ProviderModal.jsx';
import api from '../services/api.js';
import { getProviderMetadata } from '../providers/index.js';

export default function ProvidersPage() {
  const { isAuthenticated, isGuest } = useAuth();
  const [providers, setProviders] = useState([]);
  const [providerMetadata, setProviderMetadata] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);

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
    } catch (error) {
      setError(error.message || 'Failed to load providers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount and when auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      loadProviders();
    }
  }, [isAuthenticated, loadProviders]);

  // Handle provider test. ProviderCard passes (providerId) to test the stored
  // config; ProviderModal passes (providerId, apiKey) to test an unsaved key.
  const handleTestConnection = async (providerId, apiKey) => {
    try {
      const result = await api.testProviderConnection(providerId, apiKey);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleToggleProvider = async (providerId, enabled) => {
    try {
      await api.toggleProvider(providerId, enabled);
      await loadProviders();
    } catch (error) {
      throw error;
    }
  };

  const handleRemoveProvider = async (providerId) => {
    try {
      await api.deleteProvider(providerId);
      await loadProviders();
    } catch (error) {
      throw error;
    }
  };

  const handleEditProvider = (provider) => {
    setEditingProvider(provider);
    setModalOpen(true);
  };

  const handleAddProvider = () => {
    setEditingProvider(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingProvider(null);
  };

  const handleProviderSave = async (providerId, apiKey, enabled) => {
    try {
      await api.saveProviderConfig(providerId, { apiKey }, enabled);
      await loadProviders();
      setModalOpen(false);
      setEditingProvider(null);
    } catch (error) {
      throw error;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Providers</h1>
          <p className="page-description">Please sign in to manage your AI providers.</p>
        </div>
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Providers</h1>
          <p className="page-description">Guest mode: Provider management is not available. Please sign in to configure providers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Providers</h1>
        <p className="page-description">Manage your AI model providers and API keys</p>
      </div>

      <div className="page-actions">
        <button className="btn btn-primary" onClick={handleAddProvider}>
          <span aria-hidden="true">➕</span>
          Add Provider
        </button>
      </div>

      {error && (
        <div className="page-error" role="alert">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="providers-loading">
          <div className="spinner"></div>
          <p>Loading providers...</p>
        </div>
      ) : (
        <div className="providers-grid">
          {Object.keys(providerMetadata).length > 0 ? (
            Object.entries(providerMetadata).map(([providerId, metadata]) => {
              const provider = providers.find(p => p.provider === providerId);
              return (
                <ProviderCard
                  key={providerId}
                  provider={{ ...provider, id: providerId, status: provider ? 'connected' : 'not_connected' }}
                  metadata={metadata}
                  onTestConnection={handleTestConnection}
                  onToggle={handleToggleProvider}
                  onRemove={handleRemoveProvider}
                  onEdit={handleEditProvider}
                />
              );
            })
          ) : (
            <div className="providers-empty">
              <div className="empty-state">
                <span className="empty-icon" aria-hidden="true">🔌</span>
                <h3>No providers configured</h3>
                <p>Add your first AI provider to get started</p>
                <button className="btn btn-primary" onClick={handleAddProvider}>
                  <span aria-hidden="true">➕</span>
                  Add Provider
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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