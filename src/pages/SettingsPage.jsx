/* Galactus AI - Settings Page */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import { getAllProvidersMetadata } from '../../providers/index.js';

const THEMES = [
  { id: 'system', name: 'System', description: 'Match OS preference' },
  { id: 'light', name: 'Light', description: 'Always light mode' },
  { id: 'dark', name: 'Dark', description: 'Always dark mode' },
];

export default function SettingsPage() {
  const { isAuthenticated, user, logout, refreshUser } = useAuth();
  const [activeSection, setActiveSection] = useState('account');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Account settings
  const [accountForm, setAccountForm] = useState({
    name: '',
    email: '',
  });

  // Appearance settings
  const [theme, setTheme] = useState('system');
  const [fontSize, setFontSize] = useState('medium');
  const [compactMode, setCompactMode] = useState(false);

  // Chat settings
  const [chatSettings, setChatSettings] = useState({
    autoScroll: true,
    showTimestamps: true,
    streamResponses: true,
    enterToSend: true,
    saveHistory: true,
  });

  // Provider defaults
  const [defaultProvider, setDefaultProvider] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [userProviders, setUserProviders] = useState([]);
  const [providerModels, setProviderModels] = useState({});

  // Security
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);

  const allProvidersMetadata = getAllProvidersMetadata();
const getProviderIcon = (providerId) => {
  const meta = allProvidersMetadata.find(p => p.id === providerId);
  return meta?.icon || meta?.iconFallback || '🔧';
};

  // Load user data on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      setAccountForm({ name: user.name || '', email: user.email || '' });
      loadSettings();
      loadProviders();
    }
  }, [isAuthenticated, user]);

  const loadSettings = async () => {
    try {
      // Load from localStorage for client-side settings
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) setTheme(savedTheme);

      const savedFontSize = localStorage.getItem('fontSize');
      if (savedFontSize) setFontSize(savedFontSize);

      const savedCompactMode = localStorage.getItem('compactMode');
      if (savedCompactMode) setCompactMode(savedCompactMode === 'true');

      const savedChatSettings = localStorage.getItem('chatSettings');
      if (savedChatSettings) {
        setChatSettings(JSON.parse(savedChatSettings));
      }

      const savedDefaultProvider = localStorage.getItem('defaultProvider');
      if (savedDefaultProvider) setDefaultProvider(savedDefaultProvider);

      const savedDefaultModel = localStorage.getItem('defaultModel');
      if (savedDefaultModel) setDefaultModel(savedDefaultModel);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const loadProviders = async () => {
    try {
      const data = await api.getUserProviders();
      setUserProviders(data.providers || []);

      // Load models for each enabled provider
      for (const provider of data.providers || []) {
        if (provider.enabled) {
          try {
            const modelsData = await api.getProviderModels(provider.provider);
            setProviderModels(prev => ({ ...prev, [provider.provider]: modelsData.models || [] }));
          } catch (e) {
            console.warn(`Failed to load models for ${provider.provider}:`, e);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load providers:', e);
    }
  };

  const saveSetting = useCallback((key, value) => {
    try {
      localStorage.setItem(key, value);
      setSuccess(`${key} saved`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (e) {
      setError('Failed to save setting');
    }
  }, []);

  const handleAccountSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      // In a real app, this would call an API endpoint
      // await api.updateProfile(accountForm);
      setSuccess('Account settings saved');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    saveSetting('theme', newTheme);

    // Apply theme to document
    const root = document.documentElement;
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', newTheme);
    }
  };

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    saveSetting('fontSize', size);
    document.documentElement.setAttribute('data-font-size', size);
  };

  const handleCompactModeChange = (enabled) => {
    setCompactMode(enabled);
    saveSetting('compactMode', enabled.toString());
    document.documentElement.setAttribute('data-compact', enabled ? 'true' : 'false');
  };

  const handleChatSettingChange = (key, value) => {
    setChatSettings(prev => ({ ...prev, [key]: value }));
    saveSetting('chatSettings', JSON.stringify({ ...chatSettings, [key]: value }));
  };

  const handleDefaultProviderChange = (providerId) => {
    setDefaultProvider(providerId);
    saveSetting('defaultProvider', providerId);
    setDefaultModel(''); // Reset model when provider changes
    saveSetting('defaultModel', '');
  };

  const handleDefaultModelChange = (modelId) => {
    setDefaultModel(modelId);
    saveSetting('defaultModel', modelId);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await api.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setSuccess('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Are you sure you want to log out of all sessions?')) return;

    setIsLoading(true);
    try {
      await api.logoutAll();
      setSuccess('Logged out of all sessions');
      setTimeout(() => logout(), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('Revoke this session?')) return;

    try {
      await api.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setSuccess('Session revoked');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadSessions = async () => {
    try {
      const data = await api.getSessions();
      setSessions(data.sessions || []);
      setShowSessions(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const sections = [
    { id: 'account', label: 'Account', icon: '👤' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'providers', label: 'Provider Defaults', icon: '🔧' },
    { id: 'security', label: 'Security', icon: '🔒' },
  ];

  if (!isAuthenticated) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Settings</h1>
          <p className="page-description">Configure your workspace preferences</p>
        </div>
        <div className="page-content-placeholder">
          <div className="placeholder-card">
            <div className="placeholder-icon">🔒</div>
            <h3>Authentication Required</h3>
            <p>Please log in to access settings.</p>
          </div>
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'account':
        return (
          <form onSubmit={handleAccountSave} className="settings-form">
            <div className="settings-section">
              <h3>Profile</h3>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  disabled
                />
                <p className="form-hint">Email cannot be changed. Contact support if needed.</p>
              </div>
            </div>

            <div className="settings-section">
              <h3>Account Type</h3>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-1)',
                  padding: 'var(--space-1) var(--space-3)',
                  background: user.is_guest ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
                  color: user.is_guest ? 'var(--color-warning)' : 'var(--color-success)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                }}>
                  {user.is_guest ? '👤' : '✅'} {user.is_guest ? 'Guest Account' : 'Registered Account'}
                </span>
                {user.is_guest && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => window.location.href = '/auth/register'}>
                    Create Account
                  </button>
                )}
              </div>
              {user.is_guest && (
                <p className="form-hint" style={{ marginTop: 'var(--space-2)' }}>
                  Guest accounts are temporary. Create an account to save your data permanently.
                </p>
              )}
            </div>

            <div className="settings-section">
              <h3>Member Since</h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        );

      case 'appearance':
        return (
          <div className="settings-form">
            <div className="settings-section">
              <h3>Theme</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={`settings-option-card ${theme === t.id ? 'selected' : ''}`}
                    onClick={() => handleThemeChange(t.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      padding: 'var(--space-4)',
                      background: 'var(--color-bg-surface)',
                      border: theme === t.id ? '2px solid var(--color-accent-primary)' : '1px solid var(--color-border-primary)',
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <span style={{ fontSize: 'var(--font-size-2xl)' }}>
                      {t.id === 'system' ? '💻' : t.id === 'light' ? '☀️' : '🌙'}
                    </span>
                    <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{t.name}</span>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{t.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-section">
              <h3>Font Size</h3>
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                {['small', 'medium', 'large'].map(size => (
                  <button
                    key={size}
                    type="button"
                    className={`btn ${fontSize === size ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleFontSizeChange(size)}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-section">
              <h3>Layout</h3>
              <label className="checkbox-wrapper" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', padding: 'var(--space-3)', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)' }}>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={compactMode}
                  onChange={(e) => handleCompactModeChange(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Compact Mode</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Reduce spacing and padding for denser UI</div>
                </div>
              </label>
            </div>
          </div>
        );

      case 'chat':
        return (
          <form className="settings-form">
            <div className="settings-section">
              <h3>Behavior</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <label className="checkbox-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Auto-scroll to new messages</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Automatically scroll down when new messages arrive</div>
                  </div>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={chatSettings.autoScroll}
                    onChange={(e) => handleChatSettingChange('autoScroll', e.target.checked)}
                  />
                </label>

                <label className="checkbox-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Show timestamps</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Display time on each message</div>
                  </div>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={chatSettings.showTimestamps}
                    onChange={(e) => handleChatSettingChange('showTimestamps', e.target.checked)}
                  />
                </label>

                <label className="checkbox-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Stream responses</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Show tokens as they arrive (vs waiting for complete response)</div>
                  </div>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={chatSettings.streamResponses}
                    onChange={(e) => handleChatSettingChange('streamResponses', e.target.checked)}
                  />
                </label>

                <label className="checkbox-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Enter to send</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Press Enter to send, Shift+Enter for new line</div>
                  </div>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={chatSettings.enterToSend}
                    onChange={(e) => handleChatSettingChange('enterToSend', e.target.checked)}
                  />
                </label>

                <label className="checkbox-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Save chat history</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Persist conversations locally and on server</div>
                  </div>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={chatSettings.saveHistory}
                    onChange={(e) => handleChatSettingChange('saveHistory', e.target.checked)}
                  />
                </label>
              </div>
            </div>

            <div className="settings-section">
              <h3>Data Management</h3>
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  if (window.confirm('Clear all local chat history? This cannot be undone.')) {
                    localStorage.removeItem('chatHistory');
                    setSuccess('Local chat history cleared');
                    setTimeout(() => setSuccess(null), 2000);
                  }
                }}>
                  Clear Local History
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  if (window.confirm('Export all conversations as JSON?')) {
                    // In a real app, this would fetch and download conversations
                    setSuccess('Export functionality coming soon');
                    setTimeout(() => setSuccess(null), 2000);
                  }
                }}>
                  Export Conversations
                </button>
              </div>
            </div>
          </form>
        );

      case 'providers':
        return (
          <div className="settings-form">
            <div className="settings-section">
              <h3>Default Provider</h3>
              <p className="form-hint" style={{ marginBottom: 'var(--space-4)' }}>
                This provider will be selected by default when starting new chats.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {userProviders.length > 0 ? userProviders
                  .filter(p => p.enabled)
                  .map(p => {
                    const meta = allProvidersMetadata.find(m => m.id === p.provider);
                    const isSelected = defaultProvider === p.provider;
                    return (
                      <button
                        key={p.provider}
                        type="button"
                        className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleDefaultProviderChange(p.provider)}
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                      >
                        <img src={getProviderIcon(p.provider)} alt="" className="provider-logo-small" />
                        <span>{meta?.name || p.provider}</span>
                        {isSelected && <span style={{ fontSize: 'var(--font-size-xs)' }}>✓</span>}
                      </button>
                    );
                  }) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>No providers configured</span>
                  )}
              </div>
              {defaultProvider && (
                <p className="form-hint" style={{ marginTop: 'var(--space-2)' }}>
                  Default: <strong>{allProvidersMetadata.find(m => m.id === defaultProvider)?.name || defaultProvider}</strong>
                </p>
              )}
            </div>

            <div className="settings-section">
              <h3>Default Model</h3>
              <p className="form-hint" style={{ marginBottom: 'var(--space-4)' }}>
                Select a default model for the chosen provider. Only models from connected providers are shown.
              </p>
              {defaultProvider && providerModels[defaultProvider]?.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {providerModels[defaultProvider].map(model => (
                    <button
                      key={model.id}
                      type="button"
                      className={`btn ${defaultModel === model.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      onClick={() => handleDefaultModelChange(model.id)}
                    >
                      {model.name}
                      <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.7 }}>({model.tier})</span>
                    </button>
                  ))}
                </div>
              ) : defaultProvider ? (
                <p style={{ color: 'var(--color-text-muted)' }}>No models available for this provider</p>
              ) : (
                <p style={{ color: 'var(--color-text-muted)' }}>Select a provider first</p>
              )}
              {defaultModel && (
                <p className="form-hint" style={{ marginTop: 'var(--space-2)' }}>
                  Default: <strong>{providerModels[defaultProvider]?.find(m => m.id === defaultModel)?.name || defaultModel}</strong>
                </p>
              )}
            </div>

            <div className="settings-section">
              <h3>Configured Providers</h3>
              {userProviders.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {userProviders.map(p => {
                    const meta = allProvidersMetadata.find(m => m.id === p.provider);
                    return (
                      <div key={p.provider} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--space-4)',
                        background: 'var(--color-bg-surface)',
                        border: '1px solid var(--color-border-primary)',
                        borderRadius: 'var(--radius-lg)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <img src={getProviderIcon(p.provider)} alt="" className="provider-logo-small" />
                          <div>
                            <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{meta?.name || p.provider}</div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                              {p.enabled ? '✅ Enabled' : '⏸️ Disabled'} • Updated {new Date(p.updated_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => window.location.href = `/settings?provider=${p.provider}`}>
                            Configure
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="page-content-placeholder" style={{ minHeight: '200px' }}>
                  <div className="placeholder-card">
                    <div className="placeholder-icon">🔧</div>
                    <h3>No Providers Configured</h3>
                    <p>Add API keys for providers in the Providers section.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="settings-form">
            <div className="settings-section">
              <h3>Change Password</h3>
              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '400px' }}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ alignSelf: 'flex-start' }}>
                  {isLoading ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>

            <div className="settings-section">
              <h3>Active Sessions</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <p className="form-hint">View and manage your active login sessions.</p>
                {showSessions ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSessions(false)}>
                    Hide Sessions
                  </button>
                ) : (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={loadSessions}>
                    Show Sessions
                  </button>
                )}
              </div>

              {showSessions && (
                <div style={{ border: '1px solid var(--color-border-primary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  {sessions.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-border-primary)', background: 'var(--color-bg-primary)' }}>
                            <th style={{ padding: 'var(--space-3)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Device / IP</th>
                            <th style={{ padding: 'var(--space-3)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Location</th>
                            <th style={{ padding: 'var(--space-3)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Last Active</th>
                            <th style={{ padding: 'var(--space-3)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>Current</th>
                            <th style={{ padding: 'var(--space-3)', textAlign: 'right', color: 'var(--color-text-secondary)' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessions.map(session => (
                            <tr key={session.id} style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
                              <td style={{ padding: 'var(--space-3)' }}>
                                <div style={{ fontWeight: 'var(--font-weight-medium)' }}>{session.device || 'Unknown Device'}</div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{session.ip || 'Unknown IP'}</div>
                              </td>
                              <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
                                {session.location || 'Unknown'}
                              </td>
                              <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
                                {session.last_active ? new Date(session.last_active).toLocaleString() : 'Unknown'}
                              </td>
                              <td style={{ padding: 'var(--space-3)' }}>
                                {session.is_current ? (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 'var(--font-weight-medium)',
                                    background: 'var(--color-success-bg)',
                                    color: 'var(--color-success)'
                                  }}>
                                    This Session
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                                {!session.is_current && (
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleRevokeSession(session.id)}
                                    style={{ color: 'var(--color-error)' }}
                                  >
                                    Revoke
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="page-content-placeholder" style={{ minHeight: '150px', padding: 'var(--space-8)' }}>
                      <div className="placeholder-card" style={{ maxWidth: 'none' }}>
                        <div className="placeholder-icon">📱</div>
                        <h3>No Active Sessions</h3>
                        <p>No other sessions found.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--color-border-primary)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleLogoutAll}
                  style={{ color: 'var(--color-error)', borderColor: 'var(--color-error-border)' }}
                >
                  Log Out of All Sessions
                </button>
              </div>
            </div>

            <div className="settings-section">
              <h3>Danger Zone</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', borderRadius: 'var(--radius-lg)' }}>
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-error)' }}>Delete Account</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Permanently delete your account and all data. This cannot be undone.</div>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="page-description">Configure your workspace preferences</p>
      </div>

      {error && (
        <div className="auth-error" style={{ marginBottom: 'var(--space-6)' }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-success-bg)',
          border: '1px solid var(--color-success-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-success)',
          fontSize: 'var(--font-size-sm)',
          marginBottom: 'var(--space-6)'
        }}>
          <span>✅</span>
          <span>{success}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--space-8)' }}>
        {/* Sidebar Navigation */}
        <div className="settings-sidebar" style={{ position: 'sticky', top: 'calc(var(--header-height) + var(--space-6))', height: 'fit-content' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {sections.map(section => (
              <button
                key={section.id}
                type="button"
                className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  width: '100%',
                  padding: 'var(--space-3) var(--space-4)',
                  background: activeSection === section.id ? 'var(--color-accent-bg)' : 'transparent',
                  border: activeSection === section.id ? '1px solid var(--color-accent-border)' : '1px solid transparent',
                  borderRadius: 'var(--radius-md)',
                  color: activeSection === section.id ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <span style={{ fontSize: 'var(--font-size-lg)' }}>{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="settings-content">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}