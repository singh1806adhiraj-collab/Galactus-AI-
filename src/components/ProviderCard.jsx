/* Galactus AI - Provider Card Component */
import { useState, useCallback, useEffect } from 'react';
import api from '../services/api.js';

const STATUS_LABELS = {
  connected: 'Connected',
  connecting: 'Connecting...',
  error: 'Error',
  not_connected: 'Not connected',
};

const STATUS_COLORS = {
  connected: 'var(--color-success)',
  connecting: 'var(--color-warning)',
  error: 'var(--color-error)',
  not_connected: 'var(--color-text-muted)',
};

export default function ProviderCard({
  provider,
  metadata,
  onTestConnection,
  onToggle,
  onRemove,
  onEdit
}) {
  const [status, setStatus] = useState(provider.status || 'not_connected');
  const [models, setModels] = useState([]);
  const [showModels, setShowModels] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.not_connected;
  const statusLabel = STATUS_LABELS[status] || STATUS_LABELS.not_connected;
  const isEnabled = provider.enabled !== false;

  const loadModels = useCallback(async () => {
    if (!provider.id) return;
    try {
      const data = await api.getProviderModels(provider.id);
      if (data?.models) setModels(data.models);
    } catch (err) {
      setError(err.message || 'Failed to load models');
    }
  }, [provider.id]);

  // Load models automatically when the provider shows as connected
  useEffect(() => {
    if (status === 'connected') {
      loadModels();
    }
  }, [status, loadModels]);

  const handleTestConnection = async () => {
    if (!provider.id) return;
    setIsLoading(true);
    setError(null);
    try {
      setStatus('connecting');
      const result = await onTestConnection(provider.id);
      if (result.success) {
        setStatus('connected');
        if (result.models) {
          setModels(result.models);
        } else {
          await loadModels();
        }
      } else {
        setStatus('error');
        setError(result.error || 'Connection failed');
      }
    } catch (error) {
      setStatus('error');
      setError(error.message || 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!provider.id) return;
    try {
      setIsLoading(true);
      await onToggle(provider.id, !isEnabled);
      setStatus(provider.status); // Will update based on response
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!provider.id) return;
    if (!window.confirm(`Remove ${provider.name} provider? This cannot be undone.`)) return;
    try {
      setIsLoading(true);
      await onRemove(provider.id);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!provider.id) return;
    onEdit(provider);
  };

  const toggleModels = async () => {
    if (!showModels && models.length === 0) {
      await loadModels();
    }
    setShowModels(!showModels);
  };

  return (
    <div className="provider-card" style={{ borderLeftColor: statusColor }}>
      <div className="provider-card-header">
        <div className="provider-info">
          <div className="provider-avatar" style={{ backgroundColor: metadata?.color || 'var(--color-accent-primary)' }}>
            <span aria-hidden="true">{metadata?.icon || '🤖'}</span>
          </div>
          <div className="provider-details">
            <h3 className="provider-name">{metadata?.name || provider.name}</h3>
            <div className="provider-status">
              <span
                className="status-badge"
                style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
              >
                {statusLabel}
              </span>
              {models.length > 0 && (
                <span className="models-count">
                  {models.length} model{models.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="provider-actions">
          <button
            className={`btn btn-sm ${isEnabled ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleToggle}
            disabled={isLoading}
            aria-pressed={isEnabled}
            aria-label={isEnabled ? `Disable ${metadata?.name}` : `Enable ${metadata?.name}`}
          >
            {isEnabled ? 'Disable' : 'Enable'}
          </button>
          {provider.status === 'connected' && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={toggleModels}
              disabled={isLoading}
              aria-expanded={showModels}
            >
              {showModels ? 'Hide' : 'Show'} Models
            </button>
          )}
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleTestConnection}
            disabled={isLoading}
            aria-label={`Test ${metadata?.name} connection`}
          >
            Test
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleEdit}
            disabled={isLoading}
            aria-label={`Edit ${metadata?.name}`}
          >
            Edit
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={handleRemove}
            disabled={isLoading}
            aria-label={`Remove ${metadata?.name}`}
          >
            Remove
          </button>
        </div>
      </div>

      {error && (
        <div className="provider-error" style={{ color: 'var(--color-error)' }}>
          {error}
        </div>
      )}

      {showModels && models.length > 0 && (
        <div className="provider-models">
          <ul className="models-list">
            {models.map((model) => (
              <li key={model.id} className="model-item">
                <span className="model-name">{model.name}</span>
                {model.context && <span className="model-context">{model.context}</span>}
                {model.tier && <span className={`model-tier ${model.tier}`}>{model.tier}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLoading && (
        <div className="provider-loading">
          <div className="spinner-small"></div>
        </div>
      )}
    </div>
  );
}