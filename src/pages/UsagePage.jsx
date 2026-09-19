/* Galactus AI - Usage & Health Page */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
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

export default function UsagePage() {
  const { isAuthenticated, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState({ logs: [], total: 0 });
  const [healthData, setHealthData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [logsPage, setLogsPage] = useState(0);
  const [activeTab, setActiveTab] = useState('overview'); // overview, logs, health

  // Load data on mount and when date range changes
  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);

      const [statsRes, logsRes] = await Promise.all([
        api.getUsageStats(dateRange.startDate, dateRange.endDate),
        api.getUsageLogs(20, 0),
      ]);

      setStats(statsRes);
      setLogs(logsRes);
    } catch (err) {
      console.error('Failed to load usage data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHealthData = async () => {
    if (!isAuthenticated) return;

    try {
      const providersRes = await api.getUserProviders();
      const healthResults = await Promise.all(
        providersRes.providers
          .filter(p => p.enabled)
          .map(async (p) => {
            try {
              const health = await api.getProviderHealth(p.provider);
              return { provider: p.provider, ...health };
            } catch (e) {
              return { provider: p.provider, status: 'error', message: e.message };
            }
          })
      );
      setHealthData(Object.fromEntries(healthResults.map(h => [h.provider, h])));
    } catch (err) {
      console.error('Failed to load health data:', err);
    }
  };

  // Load health data when tab changes to health
  useEffect(() => {
    if (activeTab === 'health') {
      loadHealthData();
    }
  }, [activeTab]);

  const loadMoreLogs = async () => {
    try {
      const nextPage = logsPage + 1;
      const res = await api.getUsageLogs(20, nextPage * 20);
      setLogs(prev => ({ ...prev, logs: [...prev.logs, ...res.logs] }));
      setLogsPage(nextPage);
    } catch (err) {
      console.error('Failed to load more logs:', err);
    }
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'var(--color-success)';
      case 'unhealthy': return 'var(--color-error)';
      case 'not_configured': return 'var(--color-warning)';
      default: return 'var(--color-text-muted)';
    }
  };

  const getHealthStatusLabel = (status) => {
    switch (status) {
      case 'healthy': return 'Healthy';
      case 'unhealthy': return 'Unhealthy';
      case 'not_configured': return 'Not Configured';
      default: return 'Unknown';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Usage & Health</h1>
          <p className="page-description">Monitor your API usage and provider health</p>
        </div>
        <div className="page-content-placeholder">
          <div className="placeholder-card">
            <div className="placeholder-icon">🔒</div>
            <h3>Authentication Required</h3>
            <p>Please log in to view your usage statistics and provider health.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Usage & Health</h1>
          <p className="page-description">Monitor your API usage and provider health</p>
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="stat-card">
              <div className="stat-icon">⏳</div>
              <div>
                <span className="stat-value">Loading...</span>
                <span className="stat-label">Please wait</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const total = stats?.total || {};
  const byProvider = stats?.byProvider || [];
  const byModel = stats?.byModel || [];
  const daily = stats?.daily || [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Usage & Health</h1>
        <p className="page-description">Monitor your API usage, costs, and provider health</p>
      </div>

      {/* Tab Navigation */}
      <div className="workspace-tabs" style={{ marginBottom: 'var(--space-6)' }}>
        <button
          className={`workspace-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`workspace-tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Request Logs
        </button>
        <button
          className={`workspace-tab ${activeTab === 'health' ? 'active' : ''}`}
          onClick={() => setActiveTab('health')}
        >
          Provider Health
        </button>
      </div>

      {error && (
        <div className="auth-error" style={{ marginBottom: 'var(--space-6)' }}>
          <span>⚠️</span>
          <span>Failed to load data: {error}</span>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Date Range Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
            flexWrap: 'wrap'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
              From:
              <input
                type="date"
                value={dateRange.startDate || ''}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value || null })}
                className="form-input"
                style={{ width: 'auto', padding: 'var(--space-2) var(--space-3)' }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
              To:
              <input
                type="date"
                value={dateRange.endDate || ''}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value || null })}
                className="form-input"
                style={{ width: 'auto', padding: 'var(--space-2) var(--space-3)' }}
              />
            </label>
            {dateRange.startDate || dateRange.endDate ? (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDateRange({ startDate: null, endDate: null })}
              >
                Clear Filter
              </button>
            ) : null}
          </div>

          {/* Summary Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent-primary)' }}>📊</div>
              <div>
                <span className="stat-value">{formatNumber(total.total_requests)}</span>
                <span className="stat-label">Total Requests</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>📥</div>
              <div>
                <span className="stat-value">{formatNumber(total.total_input_tokens)}</span>
                <span className="stat-label">Input Tokens</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>📤</div>
              <div>
                <span className="stat-value">{formatNumber(total.total_output_tokens)}</span>
                <span className="stat-label">Output Tokens</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>⚡</div>
              <div>
                <span className="stat-value">{total.avg_latency ? formatDuration(Math.round(total.avg_latency)) : 'N/A'}</span>
                <span className="stat-label">Avg Latency</span>
              </div>
            </div>
          </div>

          {/* By Provider */}
          <div style={{ marginTop: 'var(--space-8)' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-4)' }}>
              Usage by Provider
            </h2>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {byProvider.length > 0 ? byProvider.map((p) => (
                <div key={p.provider} className="stat-card">
                  <div className="stat-icon" style={{ background: 'var(--color-accent-bg)', color: 'var(--color-accent-primary)' }}>
                    {p.provider.charAt(0).toUpperCase() + p.provider.slice(1)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                      <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{p.provider}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{formatNumber(p.requests)} requests</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      <span>📥 {formatNumber(p.input_tokens)}</span>
                      <span>📤 {formatNumber(p.output_tokens)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                      <span>Avg: {p.avg_latency ? formatDuration(Math.round(p.avg_latency)) : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="stat-card" style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No usage data for selected period
                </div>
              )}
            </div>
          </div>

          {/* By Model */}
          <div style={{ marginTop: 'var(--space-8)' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-4)' }}>
              Usage by Model
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border-primary)', textAlign: 'left' }}>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>Model</th>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>Requests</th>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>Input Tokens</th>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>Output Tokens</th>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>Avg Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {byModel.length > 0 ? byModel.map((m) => (
                    <tr key={m.model} style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{m.model}</span>
                      </td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>{formatNumber(m.requests)}</td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>{formatNumber(m.input_tokens)}</td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>{formatNumber(m.output_tokens)}</td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>{m.avg_latency ? formatDuration(Math.round(m.avg_latency)) : 'N/A'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        No usage data for selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Usage Chart (Simple Text Representation) */}
          <div style={{ marginTop: 'var(--space-8)' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-4)' }}>
              Daily Usage (Last 30 Days)
            </h2>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 'var(--space-2)' }}>
              {daily.length > 0 ? daily.slice(0, 14).map((d) => (
                <div key={d.date} className="stat-card" style={{ padding: 'var(--space-3)', minHeight: 'auto' }}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
                    {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                    {formatNumber(d.requests)}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                    {formatNumber(d.input_tokens + d.output_tokens)} tokens
                  </div>
                </div>
              )) : (
                <div className="stat-card" style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No daily data available
                </div>
              )}
            </div>
            {daily.length > 14 && (
              <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                Showing 14 of {daily.length} days
              </p>
            )}
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
              Request Logs ({logs.total} total)
            </h2>
          </div>

          {logs.logs.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border-primary)', textAlign: 'left' }}>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>Time</th>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>Provider</th>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>Model</th>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>Input</th>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>Output</th>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>Latency</th>
                    <th style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td style={{ padding: 'var(--space-3)', fontWeight: 'var(--font-weight-medium)' }}>
                        {log.provider}
                      </td>
                      <td style={{ padding: 'var(--space-3)', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>
                        {log.model}
                      </td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
                        {formatNumber(log.input_tokens)}
                      </td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
                        {formatNumber(log.output_tokens)}
                      </td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
                        {formatDuration(log.latency_ms)}
                      </td>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-medium)',
                          background: log.status === 'success' ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                          color: log.status === 'success' ? 'var(--color-success)' : 'var(--color-error)',
                        }}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="page-content-placeholder">
              <div className="placeholder-card">
                <div className="placeholder-icon">📋</div>
                <h3>No Request Logs</h3>
                <p>Start chatting to see your request history here.</p>
              </div>
            </div>
          )}

          {logs.logs.length >= 20 && (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
              <button
                className="btn btn-secondary"
                onClick={loadMoreLogs}
                disabled={logs.logs.length >= logs.total}
              >
                Load More ({logs.logs.length} / {logs.total})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Health Tab */}
      {activeTab === 'health' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
              Provider Health Status
            </h2>
            <button className="btn btn-secondary btn-sm" onClick={loadHealthData}>
              Refresh All
            </button>
          </div>

          {Object.keys(healthData).length > 0 ? (
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {Object.entries(healthData).map(([providerId, health]) => (
                <div key={providerId} className="stat-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                        <span style={{ fontSize: 'var(--font-size-xl)' }}>
                          {providerId === 'openai' ? '🤖' :
                           providerId === 'anthropic' ? '🧠' :
                           providerId === 'google' ? '🔮' :
                           providerId === 'groq' ? '⚡' : '🔧'}
                        </span>
                        <span style={{ fontWeight: 'var(--font-weight-semibold)', textTransform: 'capitalize' }}>
                          {providerId}
                        </span>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-medium)',
                          background: `${getHealthStatusColor(health.status)}20`,
                          color: getHealthStatusColor(health.status),
                        }}>
                          {getHealthStatusLabel(health.status)}
                        </span>
                      </div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                        {health.message || 'No details available'}
                      </div>
                    </div>
                    {health.lastChecked && (
                      <div style={{ textAlign: 'right', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        Last checked: {new Date(health.lastChecked).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="page-content-placeholder">
              <div className="placeholder-card">
                <div className="placeholder-icon">🏥</div>
                <h3>No Health Data</h3>
                <p>Configure providers in Settings to see their health status.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}