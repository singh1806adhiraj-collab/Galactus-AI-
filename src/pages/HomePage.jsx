/* Galactus AI - Home Page (AI Chat Workspace) */
import { useState, useRef, useEffect, useCallback } from 'react';
import ChatMessage from '../components/ChatMessage.jsx';
import Composer from '../components/Composer.jsx';
import Terminal from '../components/Terminal.jsx';
import ContextSidebar from '../components/ContextSidebar.jsx';
import api from '../services/api.js';

export default function HomePage() {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [contextTab, setContextTab] = useState('context');
  const [messageIdCounter, setMessageIdCounter] = useState(1);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const abortControllerRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, scrollToBottom]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // Ctrl/Cmd + ` - Toggle terminal
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setTerminalOpen(!terminalOpen);
      }
      // Ctrl/Cmd + B - Toggle context sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setContextOpen(!contextOpen);
      }
      // Ctrl/Cmd + N - New chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewChat();
      }
      // Escape - Stop generation or close panels
      if (e.key === 'Escape') {
        if (isStreaming) {
          handleStop();
        } else if (terminalOpen) {
          setTerminalOpen(false);
        } else if (contextOpen) {
          setContextOpen(false);
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [terminalOpen, contextOpen, isStreaming]);

  const handleSend = useCallback(async (text, options = {}) => {
    let nextId = 1;
    setMessageIdCounter(prev => {
      nextId = prev;
      return prev + 1;
    });

    const userMessage = {
      id: `msg-${nextId}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    let assistantIdNum = 0;
    setMessageIdCounter(prev => {
      assistantIdNum = prev;
      return prev + 1;
    });
    const assistantId = `msg-${assistantIdNum}`;

    const assistantMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Create abort controller for stop functionality
    abortControllerRef.current = new AbortController();

    try {
      let streamedContent = '';

      // Use the streamMessage API for streaming responses
      for await (const chunk of api.streamMessage([
        { role: 'user', content: text }
      ], {
        provider: options.provider || 'openai',
        model: options.model || 'gpt-4o',
        signal: abortControllerRef.current.signal,
      })) {
        streamedContent += chunk;
        setMessages(prev => prev.map(msg =>
          msg.id === assistantId ? { ...msg, content: streamedContent } : msg
        ));
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Chat error:', error);
        const errorMessage = error.message || 'Failed to get response from AI';
        setMessages(prev => prev.map(msg =>
          msg.id === assistantId ? { ...msg, content: `**Error:** ${errorMessage}` } : msg
        ));
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [messageIdCounter]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setIsStreaming(false);
    setMessageIdCounter(1);
  }, []);

  const handleAttachFiles = useCallback(() => {
    // Placeholder for file attachment
    console.log('Attach files clicked');
  }, []);

  const handleTerminalCommand = useCallback((cmd) => {
    console.log('Terminal command:', cmd);
  }, []);

  // Wrap handleSend to accept options from Composer
  const handleSendWithOptions = useCallback((text, options) => {
    handleSend(text, options);
  }, [handleSend]);

  return (
    <div className="chat-workspace">
      {/* Main Chat Area */}
      <main className="chat-main" ref={chatContainerRef} role="main">
        {/* Chat Header - minimal */}
        <header className="chat-header">
          <div className="chat-header-left">
            <button
              className="icon-btn"
              onClick={handleNewChat}
              aria-label="New conversation"
              title="New Chat (Ctrl+N)"
            >
              <span aria-hidden="true">➕</span>
            </button>
            <h1 className="chat-title">New Conversation</h1>
          </div>
          <div className="chat-header-right">
            <ContextSidebar
              isOpen={contextOpen}
              onClose={() => setContextOpen(false)}
              activeTab={contextTab}
              onTabChange={setContextTab}
            />
            <Terminal
              isOpen={terminalOpen}
              onToggle={() => setTerminalOpen(!terminalOpen)}
              onCommand={handleTerminalCommand}
            />
          </div>
        </header>

        {/* Messages Area - centered empty state */}
        <div className="chat-messages" role="log" aria-live="polite" aria-label="Conversation">
          <div className="messages-inner">
            {/* Centered Welcome State */}
            {messages.length === 0 && (
              <div className="welcome-state">
                <h1 className="welcome-title">Welcome to Galactus AI</h1>
              </div>
            )}

            {/* Messages */}
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id || `${message.role}-${index}`}
                message={message}
                isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Composer */}
        <Composer
          onSend={handleSendWithOptions}
          onStop={handleStop}
          onAttachFiles={handleAttachFiles}
          onNewChat={handleNewChat}
          isStreaming={isStreaming}
          placeholder={isStreaming ? 'Galactus is thinking...' : 'Message Galactus...'}
        />
      </main>
    </div>
  );
}