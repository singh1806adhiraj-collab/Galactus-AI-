/* Galactus AI - Theme Toggle Component */
import { useTheme } from '../context/ThemeContext.jsx';
import { useState, useRef, useEffect } from 'react';

const THEMES = [
  { value: 'light', label: 'Light', icon: '☀️', desc: 'Clean light theme' },
  { value: 'dark', label: 'Dark', icon: '🌙', desc: 'Premium dark theme' },
  { value: 'system', label: 'System', icon: '💻', desc: 'Match OS setting' },
];

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTheme = THEMES.find(t => t.value === theme) || THEMES[1];

  return (
    <div className="theme-toggle" ref={dropdownRef}>
      <button
        className={`theme-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Current theme: ${currentTheme.label}. Click to change.`}
        title={`Theme: ${currentTheme.label}`}
      >
        <span className="theme-toggle-icon" aria-hidden="true">{currentTheme.icon}</span>
        <span className="theme-toggle-chevron" aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="theme-toggle-dropdown" role="listbox">
          {THEMES.map((t) => (
            <button
              key={t.value}
              className={`theme-toggle-item ${theme === t.value ? 'active' : ''}`}
              role="option"
              aria-selected={theme === t.value}
              onClick={() => {
                setTheme(t.value);
                setIsOpen(false);
              }}
            >
              <span className="theme-item-icon" aria-hidden="true">{t.icon}</span>
              <div className="theme-item-info">
                <span className="theme-item-label">{t.label}</span>
                <span className="theme-item-desc">{t.desc}</span>
              </div>
              {theme === t.value && (
                <span className="theme-item-check" aria-hidden="true">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}