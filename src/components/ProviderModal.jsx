/* Galactus AI - Provider Modal Component */
import { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';
import { getProviderMetadata } from '../providers/index.js';

const INITIAL_FORM_STATE = {
  provider: '',
  apiKey: '',
  baseUrl: '',
  enabled: true,
};

export default function ProviderModal({
  isOpen,
  onClose,
  providerToEdit = null,
  onSave,
  onTestConnection,
}) {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [status, setStatus] = useState('idle'); // idle, saving, testing, saving_success, testing_success, error
  const [error, setError] = useState(null);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [configuredProviders, setConfiguredProviders] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const modalRef = useRef(null);
  const inputRef = useRef(null);

  // Load available providers metadata
  useEffect(() => {
    async function loadProviders() {
      try {
        const data = await api.getProviderMetadata();
        setAvailableProviders(data.providers);
      } catch (error) {
        console.error('Failed to load provider metadata:', error);
      }
    }
    loadProviders();
  }, []);

  // Load user's configured providers
  useEffect(() => {
    async function loadConfiguredProviders() {
      try {
        const data = await api.getUserProviders();
        setConfiguredProviders(data.providers);
      } catch (error) {
        console.error('Failed to load configured providers:', error);
      }
    }
    loadConfiguredProviders();
  }, []);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (providerToEdit) {
        // Editing existing provider
        setFormData({
          provider: providerToEdit.provider,
          apiKey: providerToEdit.config?.apiKey || '',
          baseUrl: providerToEdit.config?.baseUrl || '',
          enabled: providerToEdit.enabled !== false,
        });
      } else {
        // Adding new provider
        setFormData({ provider: '', apiKey: '', baseUrl: '', enabled: true });
      }
      setStatus('idle');
      setError(null);
    } else {
      setFormData({ provider: '', apiKey: '', baseUrl: '', enabled: true });
      setStatus('idle');
      setError(null);
    }
  }, [isOpen, providerToEdit]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.provider || !formData.apiKey) {
      setError('Please select a provider and enter an API key');
      return;
    }

    setStatus('saving');
    setError(null);

    try {
      const config = { apiKey: formData.apiKey };
      if (formData.baseUrl) {
        config.baseUrl = formData.baseUrl;
      }
      await api.saveProviderConfig(
        formData.provider,
        config,
        formData.enabled
      );
      setStatus('saving_success');
      await new Promise(resolve => setTimeout(resolve, 500));
      onSave(formData.provider, formData.apiKey, formData.enabled);
      onClose();
    } catch (error) {
      setStatus('error');
      setError(error.message || 'Failed to save provider');
    }
  };

  const handleTestConnection = async (e) => {
    e?.preventDefault();
    if (!formData.provider || !formData.apiKey) {
      setError('Please select a provider and enter an API key');
      return;
    }

    setStatus('testing');
    setError(null);

    try {
      const result = await onTestConnection(formData.provider, formData.apiKey, formData.baseUrl);
      if (result.success) {
        setStatus('testing_success');
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        setStatus('error');
        setError(result.error || 'Connection failed');
      }
    } catch (error) {
      setStatus('error');
      setError(error.message || 'Connection test failed');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (status === 'error') setError(null);
  };

  if (!isOpen) return null;

  const isEditing = !!providerToEdit;
  const selectedProviderMeta = formData.provider ? getProviderMetadata(formData.provider) : null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal modal-provider" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="provider-modal-title">
        <div className="modal-header">
          <h2 id="provider-modal-title" className="modal-title">
            {isEditing ? 'Edit Provider' : 'Add Provider'}
          </h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
            disabled={status === 'saving' || status === 'testing'}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <form id="provider-form" onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="provider" className="form-label">Provider</label>
            <select
              id="provider"
              className="form-select"
              value={formData.provider}
              onChange={(e) => handleInputChange('provider', e.target.value)}
              required
              disabled={isEditing || status === 'saving' || status === 'testing'}
            >
              <option value="">Select a provider</option>
              {availableProviders.map((provider) => {
                const isConfigured = configuredProviders.some(p => p.provider === provider.id);
                return (
                  <option
                    key={provider.id}
                    value={provider.id}
                    disabled={isConfigured && !isEditing}
                  >
                    {provider.name} {isConfigured ? '(configured)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="apiKey" className="form-label">
              API Key {selectedProviderMeta && selectedProviderMeta.requiresApiKey && <span className="required">*</span>}
            </label>
            <div className="password-input-wrapper">
              <input
                ref={inputRef}
                id="apiKey"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={formData.apiKey}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                placeholder="Enter your API key"
                autoComplete="off"
                required
                disabled={status === 'saving' || status === 'testing'}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide API key' : 'Show API key'}
                aria-pressed={showPassword}
                disabled={status === 'saving' || status === 'testing'}
              >
                <span aria-hidden="true">{showPassword ? '🙈' : '👁'}</span>
              </button>
            </div>
            <p className="form-hint">Your API key will be encrypted and stored securely. Never shared or exposed.</p>
          </div>

          <div className="form-group">
            <label htmlFor="baseUrl" className="form-label">Base URL (Optional)</label>
            <input
              id="baseUrl"
              type="text"
              className="form-input"
              value={formData.baseUrl}
              onChange={(e) => handleInputChange('baseUrl', e.target.value)}
              placeholder="e.g., https://api.openai.com/v1"
              disabled={status === 'saving' || status === 'testing'}
            />
            <p className="form-hint">Custom API base URL (e.g., OpenRouter, enterprise proxy). Leave empty for provider's official API.</p>
          </div>

          <div className="form-group">
            <label className="checkbox-wrapper">
              <input
                type="checkbox"
                className="checkbox"
                checked={formData.enabled}
                onChange={(e) => handleInputChange('enabled', e.target.checked)}
                disabled={status === 'saving' || status === 'testing'}
              />
              <span className="checkbox-label">Enabled</span>
            </label>
          </div>

          {status === 'saving' && (
            <div className="status-message saving">
              <span className="spinner-small"></span>
              Saving provider configuration...
            </div>
          )}

          {status === 'testing' && (
            <div className="status-message testing">
              <span className="spinner-small"></span>
              Testing connection...
            </div>
          )}

          {status === 'testing_success' && (
            <div className="status-message success">
              ✓ Connection successful!
            </div>
          )}

          {status === 'saving_success' && (
            <div className="status-message success">
              ✓ Provider saved successfully!
            </div>
          )}

          {error && (
            <div className="form-error" role="alert">
              <span aria-hidden="true">⚠</span>
              <span>{error}</span>
            </div>
          )}
        </form>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTestConnection}
            disabled={status === 'saving' || status === 'testing'}
          >
            {status === 'testing' ? (
              <>
                <span className="spinner-small"></span>
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={status === 'saving' || status === 'testing'}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="provider-form"
            className="btn btn-primary"
            disabled={status === 'saving' || status === 'testing'}
          >
            {status === 'saving' ? (
              <>
                <span className="spinner-small"></span>
                Saving...
              </>
            ) : isEditing ? (
              'Update Provider'
            ) : (
              'Add Provider'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}