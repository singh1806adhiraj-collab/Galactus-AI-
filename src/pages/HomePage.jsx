/* Galactus AI - Home Page (AI Chat Workspace) */
import { useState, useRef, useEffect, useCallback } from 'react';
import ChatMessage from '../components/ChatMessage.jsx';
import Composer from '../components/Composer.jsx';
import Terminal from '../components/Terminal.jsx';
import ContextSidebar from '../components/ContextSidebar.jsx';

const welcomeMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Welcome to **Galactus AI** — your AI orchestration workspace for developers.

I'm ready to help you **build, debug, explain, and modify code** across your projects.

**What I can do:**
• Write and refactor code in any language
• Debug errors and explain complex logic
• Generate tests, documentation, and configs
• Work with your existing codebase context
• Orchestrate across multiple AI providers

**Get started:** Select a model and provider combo above, then type your request below.`,
  timestamp: 'Now'
};

export default function HomePage() {
  const [messages, setMessages] = useState([welcomeMessage]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [contextTab, setContextTab] = useState('context');
  const [messageIdCounter, setMessageIdCounter] = useState(1);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

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

  const handleSend = useCallback((text) => {
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

    // Simulate streaming response (placeholder for future AI integration)
    let assistantIdNum = 0;
    setMessageIdCounter(prev => {
      assistantIdNum = prev;
      return prev + 1;
    });
    const assistantId = `msg-${assistantIdNum}`;
    let streamedContent = '';

    const assistantMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Simulate streaming chunks
    const fullResponse = `This is a **placeholder response**. The AI integration will be connected in a future task.

You said: "${text}"

**Next steps for Phase 3:**
1. Connect AI provider APIs (OpenAI, Anthropic, Google, DeepSeek, OpenRouter)
2. Implement streaming responses with Server-Sent Events
3. Add tool/function calling for file operations
4. Implement conversation persistence
5. Add code execution in terminal
6. Build provider health monitoring

*Model: GPT-4o • Provider: OpenAI • Combo: Flagship Fallback*`;

    let charIndex = 0;
    const streamInterval = setInterval(() => {
      if (charIndex < fullResponse.length) {
        streamedContent += fullResponse[charIndex];
        charIndex++;
        setMessages(prev => prev.map(msg =>
          msg.id === assistantId ? { ...msg, content: streamedContent } : msg
        ));
      } else {
        clearInterval(streamInterval);
        setIsStreaming(false);
      }
    }, 8); // ~125 chars/sec
  }, [messageIdCounter]);

  const handleStop = useCallback(() => {
    setIsStreaming(false);
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([welcomeMessage]);
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

  return (
    <div className="chat-workspace">
      {/* Main Chat Area */}
      <main className="chat-main" ref={chatContainerRef} role="main">
        {/* Chat Header */}
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
            <span className="chat-status">
              <span className="status-dot ready" aria-hidden="true"></span>
              Ready
            </span>
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

        {/* Messages Area */}
        <div className="chat-messages" role="log" aria-live="polite" aria-label="Conversation">
          <div className="messages-inner">
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
          onSend={handleSend}
          onStop={handleStop}
          onAttachFiles={handleAttachFiles}
          onNewChat={handleNewChat}
          isStreaming={isStreaming}
          placeholder={isStreaming ? 'Galactus is thinking...' : 'Message Galactus...'}
        />
      </main>

      {/* Terminal & Context are rendered inline via ContextSidebar and Terminal components */}
    </div>
  );
}