/* Galactus AI - Context/Files Sidebar Component */
import { useState } from 'react';

const mockFiles = [
  { name: 'src/', type: 'folder', children: [
    { name: 'components/', type: 'folder', children: [
      { name: 'ChatMessage.jsx', type: 'file' },
      { name: 'Composer.jsx', type: 'file' },
      { name: 'ModelSelector.jsx', type: 'file' },
      { name: 'ProviderComboSelector.jsx', type: 'file' },
      { name: 'Terminal.jsx', type: 'file' },
    ]},
    { name: 'pages/', type: 'folder', children: [
      { name: 'HomePage.jsx', type: 'file' },
      { name: 'LoginPage.jsx', type: 'file' },
      { name: 'ProvidersPage.jsx', type: 'file' },
    ]},
    { name: 'context/', type: 'folder', children: [
      { name: 'ThemeContext.jsx', type: 'file' },
    ]},
  ]},
  { name: 'public/', type: 'folder', children: [] },
  { name: 'package.json', type: 'file' },
  { name: 'vite.config.js', type: 'file' },
  { name: 'index.html', type: 'file' },
];

function FileTree({ items, level = 0 }) {
  const [expanded, setExpanded] = useState({});

  const toggleFolder = (name) => {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const isExpanded = (name) => expanded[name] !== false;

  return (
    <ul className="file-tree" role="tree">
      {items.map((item) => (
        <li key={item.name} className="file-tree-item" role="treeitem" aria-level={level + 1}>
          {item.type === 'folder' ? (
            <div
              className="file-tree-folder"
              onClick={() => toggleFolder(item.name)}
              aria-expanded={isExpanded(item.name)}
            >
              <span className="folder-icon" aria-hidden="true">
                {isExpanded(item.name) ? '▼' : '▶'}
              </span>
              <span className="folder-name">{item.name}</span>
            </div>
          ) : (
            <div className="file-tree-file">
              <span className="file-icon" aria-hidden="true">📄</span>
              <span className="file-name">{item.name}</span>
            </div>
          )}
          {item.type === 'folder' && item.children && isExpanded(item.name) && (
            <FileTree items={item.children} level={level + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function ContextSidebar({ isOpen, onClose, activeTab = 'context', onTabChange }) {
  const tabs = [
    { id: 'context', label: 'Context', icon: '💬' },
    { id: 'files', label: 'Files', icon: '📁' },
  ];

  return (
    <>
      <button
        className={`context-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-label={isOpen ? 'Close context panel' : 'Open context panel'}
        title={isOpen ? 'Close Context' : 'Open Context'}
      >
        <span aria-hidden="true">{activeTab === 'files' ? '📁' : '💬'}</span>
        <span>{activeTab === 'files' ? 'Files' : 'Context'}</span>
        <span className="context-toggle-hint">Ctrl+B</span>
      </button>

      {isOpen && (
        <aside className="context-panel" role="complementary" aria-label="Context and files">
          <div className="context-header">
            <div className="context-tabs" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  className={`context-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => onTabChange(tab.id)}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  id={`${tab.id}-tab`}
                >
                  <span aria-hidden="true">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
            <button
              className="context-close-btn"
              onClick={onClose}
              aria-label="Close panel"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          <div className="context-content">
            {activeTab === 'context' && (
              <div className="context-panel" id="context-panel" role="tabpanel" aria-labelledby="context-tab">
                <div className="context-empty">
                  <span className="context-icon" aria-hidden="true">💬</span>
                  <h3>Conversation Context</h3>
                  <p>No active conversation. Start a new chat to see context here.</p>
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div className="context-panel" id="files-panel" role="tabpanel" aria-labelledby="files-tab">
                <div className="file-tree-container">
                  <FileTree items={mockFiles} />
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  );
}