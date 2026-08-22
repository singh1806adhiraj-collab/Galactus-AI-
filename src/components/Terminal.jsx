/* Galactus AI - Terminal Component */
import { useState, useRef, useEffect } from 'react';

const welcomeLines = [
  { type: 'info', text: 'Galactus Terminal v0.1.0' },
  { type: 'info', text: 'Type `help` for available commands' },
  { type: 'prompt', text: 'galactus@workspace:~$', input: '' },
];

const helpCommands = [
  { cmd: 'help', desc: 'Show this help message' },
  { cmd: 'clear', desc: 'Clear terminal output' },
  { cmd: 'ls', desc: 'List files in current directory' },
  { cmd: 'cd <dir>', desc: 'Change directory' },
  { cmd: 'pwd', desc: 'Print working directory' },
  { cmd: 'git <args>', desc: 'Run git commands' },
  { cmd: 'npm <args>', desc: 'Run npm commands' },
  { cmd: 'node <file>', desc: 'Run Node.js script' },
  { cmd: 'python <file>', desc: 'Run Python script' },
  { cmd: 'exit', desc: 'Close terminal' },
];

export default function Terminal({ onCommand, isOpen = false, onToggle }) {
  const [lines, setLines] = useState(welcomeLines);
  const [currentInput, setCurrentInput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cwd, setCwd] = useState('~');
  const terminalRef = useRef(null);
  const inputRef = useRef(null);

  // Focus input when terminal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const addOutput = (text, type = 'output') => {
    setLines(prev => [...prev, { type, text }]);
  };

  const executeCommand = (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Add to history
    setHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);

    // Parse command
    const [command, ...args] = trimmed.split(' ');

    switch (command) {
      case 'help':
        helpCommands.forEach(({ cmd, desc }) => {
          addOutput(`${cmd.padEnd(15)} ${desc}`, 'help');
        });
        break;
      case 'clear':
        setLines([{ type: 'prompt', text: `galactus@workspace:${cwd}$`, input: '' }]);
        return;
      case 'ls':
        addOutput('src/        components/  layouts/  pages/  routes/  styles/', 'output');
        addOutput('public/     assets/      styles/', 'output');
        addOutput('package.json  vite.config.js  index.html', 'output');
        break;
      case 'cd':
        if (args[0]) {
          setCwd(args[0] === '..' ? '~' : args[0]);
          addOutput(`Changed to ${args[0]}`, 'output');
        } else {
          addOutput('Usage: cd <directory>', 'error');
        }
        break;
      case 'pwd':
        addOutput(`/home/galactus/workspace/${cwd === '~' ? '' : cwd}`, 'output');
        break;
      case 'git':
        addOutput(`git ${args.join(' ')}`, 'output');
        addOutput('(Git integration coming soon)', 'info');
        break;
      case 'npm':
        addOutput(`npm ${args.join(' ')}`, 'output');
        addOutput('(NPM integration coming soon)', 'info');
        break;
      case 'exit':
        onToggle?.();
        return;
      default:
        if (onCommand) {
          onCommand(trimmed);
        } else {
          addOutput(`galactus: ${command}: command not found`, 'error');
          addOutput('Type `help` for available commands', 'info');
        }
    }

    // Add new prompt
    setLines(prev => [...prev, { type: 'prompt', text: `galactus@workspace:${cwd}$`, input: '' }]);
    setCurrentInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(currentInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentInput(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple tab completion
      const commands = ['help', 'clear', 'ls', 'cd', 'pwd', 'git', 'npm', 'node', 'python', 'exit'];
      const matches = commands.filter(c => c.startsWith(currentInput));
      if (matches.length === 1) {
        setCurrentInput(matches[0] + ' ');
      } else if (matches.length > 1) {
        addOutput(matches.join('  '), 'help');
      }
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setLines([{ type: 'prompt', text: `galactus@workspace:${cwd}$`, input: '' }]);
    }
  };

  const handleInputChange = (e) => {
    setCurrentInput(e.target.value);
    setLines(prev => {
      const newLines = [...prev];
      const lastLine = newLines[newLines.length - 1];
      if (lastLine.type === 'prompt') {
        newLines[newLines.length - 1] = { ...lastLine, input: e.target.value };
      }
      return newLines;
    });
  };

  if (!isOpen) {
    return (
      <button
        className="terminal-toggle-btn"
        onClick={onToggle}
        aria-label="Open terminal"
        title="Open Terminal (Ctrl+`)"
      >
        <span aria-hidden="true">💻</span>
        <span>Terminal</span>
        <span className="terminal-toggle-hint">Ctrl+`</span>
      </button>
    );
  }

  return (
    <div className="terminal-panel" ref={terminalRef}>
      <div className="terminal-header">
        <div className="terminal-title">
          <span className="terminal-icon" aria-hidden="true">💻</span>
          <span>Terminal</span>
          <span className="terminal-path">{cwd}</span>
        </div>
        <div className="terminal-controls">
          <button
            className="terminal-btn"
            onClick={() => setLines([{ type: 'prompt', text: `galactus@workspace:${cwd}$`, input: '' }])}
            aria-label="Clear terminal"
            title="Clear (Ctrl+L)"
          >
            <span aria-hidden="true">🗑</span>
          </button>
          <button
            className="terminal-btn"
            onClick={onToggle}
            aria-label="Close terminal"
            title="Close"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      </div>
      <div className="terminal-output" role="log" aria-live="polite" ref={terminalRef}>
        {lines.map((line, index) => (
          <div key={index} className={`terminal-line ${line.type}`}>
            {line.type === 'prompt' ? (
              <>
                <span className="prompt-prefix">{line.text}</span>
                <input
                  ref={inputRef}
                  type="text"
                  className="terminal-input"
                  value={line.input || currentInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  spellCheck="false"
                  aria-label="Terminal input"
                />
              </>
            ) : line.type === 'output' ? (
              <span className="terminal-output-text">{line.text}</span>
            ) : line.type === 'error' ? (
              <span className="terminal-error">{line.text}</span>
            ) : line.type === 'info' ? (
              <span className="terminal-info">{line.text}</span>
            ) : line.type === 'help' ? (
              <span className="terminal-help">{line.text}</span>
            ) : (
              <span>{line.text}</span>
            )}
          </div>
        ))}
      </div>
      <div className="terminal-status">
        <span className="status-item">Ready</span>
        <span className="status-item">Bash</span>
        <span className="status-item">{cwd}</span>
      </div>
    </div>
  );
}