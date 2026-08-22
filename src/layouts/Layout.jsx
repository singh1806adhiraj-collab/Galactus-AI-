/* Galactus AI - Main Layout */
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import ThemeToggle from '../components/ThemeToggle.jsx';

const navItems = [
  { path: '/', label: 'Home', icon: '💬' },
  { path: '/providers', label: 'Providers', icon: '🔌' },
  { path: '/usage', label: 'Usage & Health', icon: '📊' },
  { path: '/combos', label: 'Combos', icon: '🔗' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();

  return (
    <>
      <aside
        className={`sidebar ${isOpen ? 'open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="sidebar-header">
          <h1 className="logo">Galactus AI</h1>
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
        <div className="sidebar-footer">
          <span className="version">v0.1.0</span>
        </div>
      </aside>
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
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
        <h2 className="page-title">Galactus AI</h2>
      </div>
      <div className="header-right">
        <ThemeToggle />
        <button className="icon-btn" aria-label="Notifications">
          <span aria-hidden="true">🔔</span>
        </button>
        <button className="icon-btn" aria-label="User menu">
          <span aria-hidden="true">👤</span>
        </button>
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