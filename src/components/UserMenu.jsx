/* Galactus AI - User Menu Component */
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function UserMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/login');
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className={`user-menu-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="User menu"
      >
        <div className="user-avatar">
          <span aria-hidden="true">👤</span>
        </div>
        <span className="user-name">{user.name}</span>
        <span className="user-menu-chevron" aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-menu-header">
            <div className="user-info">
              <div className="user-avatar-large">
                <span aria-hidden="true">👤</span>
              </div>
              <div className="user-details">
                <span className="user-display-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
            {user.isGuest && (
              <span className="guest-badge">Guest Session</span>
            )}
          </div>
          <div className="user-menu-divider"></div>
          <button className="user-menu-item" role="menuitem" onClick={() => navigate('/settings')}>
            <span aria-hidden="true">⚙️</span>
            <span>Settings</span>
          </button>
          <div className="user-menu-divider"></div>
          <button className="user-menu-item danger" role="menuitem" onClick={handleLogout}>
            <span aria-hidden="true">🚪</span>
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}