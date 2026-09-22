/* Galactus AI - Main Layout */
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import ThemeToggle from '../components/ThemeToggle.jsx';
import UserMenu from '../components/UserMenu.jsx';
import api from '../services/api.js';
import galactusLogo from "../assets/GalactusAI.png";

const navItems = [
  { path: '/chat', label: 'Chat', icon: '💬' },
  { path: '/providers', label: 'Providers', icon: '🔌' },
  { path: '/usage', label: 'Usage & Health', icon: '📊' },
  { path: '/combos', label: 'Combos', icon: '🔗' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, title }

  const fetchConversations = useCallback(async () => {
    setConversationsLoading(true);
    setConversationsError(null);
    try {
      const data = await api.getConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      setConversationsError(err.message);
      console.error('Failed to load conversations:', err);
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleNewConversation = () => {
    window.location.href = '/chat';
  };

  const handleDeleteConversation = (id, title) => {
    setDeleteConfirm({ id, title });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/conversations/${deleteConfirm.id}`);
      setConversations(prev => prev.filter(c => c.id !== deleteConfirm.id));
      // If we deleted the active conversation, navigate to new chat
      if (window.location.pathname === `/chat/${deleteConfirm.id}`) {
        window.location.href = '/chat';
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      alert('Failed to delete conversation');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  const formatConversationTime = (updatedAt) => {
    const date = new Date(updatedAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <aside
        className={`sidebar ${isOpen ? 'open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="sidebar-header">
          <a href="/chat" className="logo" aria-label="Galactus AI Home">
            <img src={galactusLogo} alt="" className="logo-icon" width="32" height="32" />
            <span className="logo-text">Galactus AI</span>
          </a>
        </div>
        <nav className="sidebar-nav">
          <ul role="list">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`}
                  aria-current={location.pathname === item.path ? 'page' : undefined}
                  onClick={onClose}
                >
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Past Conversations Section */}
        <div className="sidebar-conversations">
          <div className="conversations-header">
            <h3 className="conversations-title">Past Conversations</h3>
            <button
              className="new-conversation-btn"
              onClick={handleNewConversation}
              aria-label="Start new conversation"
              title="New Conversation"
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>

          {conversationsLoading ? (
            <div className="conversations-loading">
              <span className="loading-spinner" aria-hidden="true"></span>
            </div>
          ) : conversationsError ? (
            <div className="conversations-error" role="alert">
              <span>Failed to load conversations</span>
            </div>
          ) : conversations.length > 0 ? (
            <ul className="conversation-items" role="list" aria-label="Conversation history">
              {conversations.map((conv) => (
                <li key={conv.id} role="listitem">
                  <NavLink
                    to={`/chat/${conv.id}`}
                    className={({ isActive }) =>
                      `conversation-item ${isActive ? 'active' : ''}`}
                    aria-current={location.pathname === `/chat/${conv.id}` ? 'page' : undefined}
                    onClick={onClose}
                  >
                    <div className="conversation-content">
                      <span className="conversation-title-text">{conv.title || 'New Conversation'}</span>
                      <span className="conversation-time">{formatConversationTime(conv.updated_at)}</span>
                    </div>
                    <button
                      className="conversation-delete-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteConversation(conv.id, conv.title);
                      }}
                      aria-label={`Delete "${conv.title || 'New Conversation'}"`}
                      title="Delete conversation"
                    >
                      <span aria-hidden="true">🗑</span>
                    </button>
                  </NavLink>
                </li>
              ))}
            </ul>
          ) : (
            <div className="conversations-empty">
              <span className="empty-state">No conversations yet.</span>
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <span className="version">v0.1.0</span>
        </div>
      </aside>
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="delete-confirm-overlay" onClick={handleCancelDelete}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-header">
              <h3 className="delete-confirm-title">Delete Conversation</h3>
              <button
                className="delete-confirm-close"
                onClick={handleCancelDelete}
                aria-label="Close"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <div className="delete-confirm-body">
              <p className="delete-confirm-message">
                Are you sure you want to delete <strong>"{deleteConfirm.title || 'New Conversation'}"</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="delete-confirm-footer">
              <button className="delete-confirm-cancel" onClick={handleCancelDelete}>Cancel</button>
              <button className="delete-confirm-delete" onClick={handleConfirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Header({ onMenuClick }) {
  return (
    <header className="header" role="banner">
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={onMenuClick} aria-label="Toggle navigation menu" aria-expanded="false">
          <span aria-hidden="true">☰</span>
        </button>
        <a href="/chat" className="page-title" aria-label="Galactus AI Home">
          <img src={galactusLogo} alt="" className="logo-icon" width="28" height="28" />
          <span>Galactus AI</span>
        </a>
      </div>
      <div className="header-right">
        <ThemeToggle />
        <button className="icon-btn" aria-label="Notifications">
          <span aria-hidden="true">🔔</span>
        </button>
        <UserMenu />
      </div>
    </header>
  );
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="layout-main">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="main-content" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}