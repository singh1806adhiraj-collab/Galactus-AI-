/* Galactus AI - Combos Page */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { getAllProvidersMetadata } from '../../providers/index.js';

const defaultCombos = [
  {
    id: 'flagship-fallback',
    name: 'Flagship Fallback',
    models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-1.5-pro'],
    priority: 'Quality First',
    description: 'Best models with automatic failover'
  },
  {
    id: 'speed-combo',
    name: 'Speed Combo',
    models: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-haiku', 'google/gemini-1.5-flash'],
    priority: 'Speed First',
    description: 'Fastest responses for quick tasks'
  },
  {
    id: 'reasoning-combo',
    name: 'Reasoning Combo',
    models: ['deepseek/deepseek-r1', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    priority: 'Reasoning First',
    description: 'Optimized for complex problem solving'
  },
  {
    id: 'cost-combo',
    name: 'Cost Optimized',
    models: ['openai/gpt-4o-mini', 'google/gemini-1.5-flash', 'deepseek/deepseek-v3'],
    priority: 'Cost First',
    description: 'Most cost-effective for volume'
  },
];

export default function CombosPage() {
  const { isAuthenticated, user } = useAuth();
  const [userCombos, setUserCombos] = useState([]);
  const [userProviders, setUserProviders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    models: ['', '', ''],
    priority: 'Balanced',
    description: '',
  });

  const allProvidersMetadata = getAllProvidersMetadata();
  const priorities = ['Quality First', 'Speed First', 'Reasoning First', 'Cost First', 'Balanced'];

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const [combosRes, providersRes] = await Promise.all([
        api.get('/combos'),
        api.getUserProviders(),
      ]);
      setUserCombos(combosRes.combos || []);
      setUserProviders(providersRes.providers || []);
    } catch (err) {
      console.error('Failed to load combos:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getConnectedProviderIds = () => {
    return userProviders
      .filter(p => p.enabled)
      .map(p => p.provider);
  };

  const isModelAvailable = (modelId) => {
    const providerId = modelId.split('/')[0];
    return getConnectedProviderIds().includes(providerId);
  };

  const validateModels = (models) => {
    return models.filter(m => m && isModelAvailable(m));
  };

  const handleCreateCombo = async () => {
    const validModels = validateModels(formData.models);
    if (validModels.length === 0) {
      setError('Please select at least one available model');
      return;
    }

    if (!formData.name.trim()) {
      setError('Combo name is required');
      return;
    }

    try {
      await api.post('/combos', {
        name: formData.name.trim(),
        models: validModels,
        priority: formData.priority,
        description: formData.description.trim(),
      });
      setShowCreateModal(false);
      setFormData({ name: '', models: ['', '', ''], priority: 'Balanced', description: '' });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateCombo = async () => {
    const validModels = validateModels(formData.models);
    if (validModels.length === 0) {
      setError('Please select at least one available model');
      return;
    }

    if (!formData.name.trim()) {
      setError('Combo name is required');
      return;
    }

    try {
      await api.patch(`/combos/${editingCombo.id}`, {
        name: formData.name.trim(),
        models: validModels,
        priority: formData.priority,
        description: formData.description.trim(),
      });
      setEditingCombo(null);
      setFormData({ name: '', models: ['', '', ''], priority: 'Balanced', description: '' });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCombo = async (comboId) => {
    if (!window.confirm('Are you sure you want to delete this combo?')) return;

    try {
      await api.delete(`/combos/${comboId}`);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditModal = (combo) => {
    setEditingCombo(combo);
    setFormData({
      name: combo.name,
      models: [...combo.models, '', ''].slice(0, 3),
      priority: combo.priority,
      description: combo.description || '',
    });
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingCombo(null);
    setFormData({ name: '', models: ['', '', ''], priority: 'Balanced', description: '' });
    setError(null);
  };

  const getProviderMetadata = (providerId) => {
    return allProvidersMetadata.find(p => p.id === providerId);
  };

  const getModelDisplayName = (modelId) => {
    const [providerId, ...modelParts] = modelId.split('/');
    const provider = getProviderMetadata(providerId);
    const modelName = modelParts.join('/');
    return provider ? `${provider.iconFallback} ${modelName}` : modelId;
  };

  const isDefaultCombo = (comboId) => {
    return defaultCombos.some(c => c.id === comboId);
  };

  if (!isAuthenticated) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Model Combos</h1>
          <p className="page-description">Create and manage provider+model combos for failover</p>
        </div>
        <div className="page-content-placeholder">
          <div className="placeholder-card">
            <div className="placeholder-icon">🔒</div>
            <h3>Authentication Required</h3>
            <p>Please log in to create and manage model combos.</p>
          </div>
        </div>
      </div>
    );
  }

  const connectedProviders = getConnectedProviderIds();
  const availableModels = allProvidersMetadata
    .filter(p => connectedProviders.includes(p.id))
    .flatMap(p =>
      (p.getModels ? p.getModels() : []).map(m => ({
        id: `${p.id}/${m.id}`,
        name: m.name,
        provider: p.name,
        providerIcon: p.iconFallback,
        tier: m.tier,
      }))
    );

  const availableModelsByProvider = {};
  availableModels.forEach(m => {
    const providerId = m.id.split('/')[0];
    if (!availableModelsByProvider[providerId]) {
      availableModelsByProvider[providerId] = [];
    }
    availableModelsByProvider[providerId].push(m);
  });

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h1>Model Combos</h1>
            <p className="page-description">Create and manage provider+model combos for automatic failover</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditingCombo(null); setFormData({ name: '', models: ['', '', ''], priority: 'Balanced', description: '' }); setShowCreateModal(true); }}>
            <span aria-hidden="true">+</span> New Combo
          </button>
        </div>
      </div>

      {error && (
        <div className="auth-error" style={{ marginBottom: 'var(--space-6)' }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Connected Providers Status */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Connected Providers ({connectedProviders.length})
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {connectedProviders.length > 0 ? connectedProviders.map(providerId => {
            const meta = getProviderMetadata(providerId);
            return (
              <span key={providerId} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                padding: 'var(--space-1) var(--space-3)',
                background: 'var(--color-accent-bg)',
                color: 'var(--color-accent-primary)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-medium)',
              }}>
                {meta?.iconFallback} {meta?.name}
              </span>
            );
          }) : (
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
              No providers configured. Go to Settings to add providers.
            </span>
          )}
        </div>
      </div>

      {/* Default Combos */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-4)' }}>
          Default Combos
        </h2>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {defaultCombos.map((combo) => {
            const availableModelCount = combo.models.filter(m => isModelAvailable(m)).length;
            const isUsable = availableModelCount > 0;

            return (
              <div key={combo.id} className="stat-card" style={{ opacity: isUsable ? 1 : 0.6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <span className="stat-icon" style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent-primary)' }}>🔗</span>
                    <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{combo.name}</span>
                    <span style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--color-warning-bg)',
                      color: 'var(--color-warning)'
                    }}>
                      Default
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
                    {combo.description}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginBottom: 'var(--space-2)' }}>
                    {combo.models.map((model, i) => {
                      const available = isModelAvailable(model);
                      return (
                        <span
                          key={i}
                          className="combo-model-tag"
                          style={{
                            opacity: available ? 1 : 0.4,
                            textDecoration: available ? 'none' : 'line-through',
                          }}
                        >
                          {getModelDisplayName(model)}
                        </span>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                    {availableModelCount}/{combo.models.length} models available • Priority: {combo.priority}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User Combos */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
            Your Combos ({userCombos.length})
          </h2>
        </div>

        {userCombos.length > 0 ? (
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {userCombos.map((combo) => (
              <div key={combo.id} className="stat-card">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>⚡</span>
                      <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{combo.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                      <button
                        className="icon-btn-sm"
                        onClick={() => openEditModal(combo)}
                        aria-label="Edit combo"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="icon-btn-sm"
                        onClick={() => handleDeleteCombo(combo.id)}
                        aria-label="Delete combo"
                        title="Delete"
                        style={{ color: 'var(--color-error)' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
                    {combo.description || 'No description'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginBottom: 'var(--space-2)' }}>
                    {combo.models.map((model, i) => {
                      const available = isModelAvailable(model);
                      return (
                        <span
                          key={i}
                          className="combo-model-tag"
                          style={{
                            opacity: available ? 1 : 0.4,
                            textDecoration: available ? 'none' : 'line-through',
                          }}
                        >
                          {getModelDisplayName(model)}
                        </span>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                    Priority: {combo.priority} • {combo.models.length} model(s) • {combo.models.filter(isModelAvailable).length} available
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="page-content-placeholder">
            <div className="placeholder-card">
              <div className="placeholder-icon">⚡</div>
              <h3>No Custom Combos</h3>
              <p>Create your first combo to define custom provider failover chains.</p>
              <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => setShowCreateModal(true)}>
                Create Combo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCombo ? 'Edit Combo' : 'Create New Combo'}</h3>
              <button className="icon-btn" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Combo Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., My Custom Fallback"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Models (in failover order)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {formData.models.map((model, i) => (
                    <div key={i} style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <select
                        className="form-input"
                        style={{ flex: 1 }}
                        value={model}
                        onChange={(e) => {
                          const newModels = [...formData.models];
                          newModels[i] = e.target.value;
                          setFormData({ ...formData, models: newModels });
                        }}
                      >
                        <option value="">Select a model...</option>
                        {Object.entries(availableModelsByProvider).map(([providerId, models]) => {
                          const providerMeta = getProviderMetadata(providerId);
                          return (
                            <optgroup key={providerId} label={`${providerMeta?.iconFallback} ${providerMeta?.name}`}>
                              {models.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.tier})
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                      {i > 0 && (
                        <button
                          type="button"
                          className="icon-btn-sm"
                          onClick={() => {
                            const newModels = formData.models.filter((_, idx) => idx !== i);
                            setFormData({ ...formData, models: [...newModels, ''] });
                          }}
                          aria-label="Remove model"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {formData.models.length < 5 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setFormData({ ...formData, models: [...formData.models, ''] })}
                      style={{ alignSelf: 'flex-start' }}
                    >
                      + Add Model
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
                  Models are tried in order. Only models from your connected providers are shown.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-input"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this combo is for..."
                  rows={3}
                />
              </div>

              {error && (
                <div className="auth-error" style={{ marginBottom: 'var(--space-4)' }}>
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={editingCombo ? handleUpdateCombo : handleCreateCombo}
                disabled={!formData.name.trim() || formData.models.every(m => !m)}
              >
                {editingCombo ? 'Save Changes' : 'Create Combo'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          z-index: var(--z-modal);
          animation: fadeIn 0.2s ease-out;
        }
        .modal {
          background: var(--color-bg-surface);
          border: 1px solid var(--color-border-primary);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-xl);
          animation: slideUp 0.2s ease-out;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4) var(--space-6);
          border-bottom: 1px solid var(--color-border-primary);
        }
        .modal-header h3 {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-semibold);
          margin: 0;
        }
        .modal-body {
          padding: var(--space-6);
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-3);
          padding: var(--space-4) var(--space-6);
          border-top: 1px solid var(--color-border-primary);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}