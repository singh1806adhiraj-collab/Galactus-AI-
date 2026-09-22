/* Galactus AI - Home Page (AI Chat Workspace) */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatMessage from '../components/ChatMessage.jsx';
import Composer from '../components/Composer.jsx';
import Terminal from '../components/Terminal.jsx';
import ContextSidebar from '../components/ContextSidebar.jsx';
import api from '../services/api.js';

function generateId() {
  return crypto.randomUUID();
}

function generateTitleFromMessage(content) {
  if (!content) return 'New Conversation';
  // Clean and truncate first user message for title
  const cleaned = content.trim().replace(/\s+/g, ' ');
  const words = cleaned.split(' ');
  if (words.length <= 8) return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return words.slice(0, 8).join(' ') + '...';
}

export default function HomePage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [contextTab, setContextTab] = useState('context');
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [conversationTitle, setConversationTitle] = useState('New Conversation');
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isFirstMessage = useRef(false);
  // Streaming performance: batch updates
  const pendingContentRef = useRef('');
  const animationFrameRef = useRef(null);

  // Memoized ChatMessage to prevent re-renders of stable messages
  const MemoizedChatMessage = useMemo(() => React.memo(ChatMessage), []);
  const memoizedMessages = useMemo(() => messages, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, scrollToBottom]);

  // Load conversation when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      // New conversation
      setMessages([]);
      setActiveConversationId(null);
      setConversationTitle('New Conversation');
      isFirstMessage.current = true;
    }
  }, [conversationId]);

  const loadConversation = async (id) => {
    try {
      const data = await api.getConversation(id);
      if (data.conversation && data.messages) {
        setActiveConversationId(data.conversation.id);
        setConversationTitle(data.conversation.title || 'Untitled');
        // Convert messages to UI format
        const formattedMessages = data.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(formattedMessages);
        isFirstMessage.current = false;
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setMessages([]);
      setActiveConversationId(null);
      setConversationTitle('New Conversation');
      isFirstMessage.current = true;
    }
  };

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
    console.log('[DEBUG] handleSend called:', { text, options });

    const userMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    // Update title from first user message if this is the first message
    if (isFirstMessage.current && activeConversationId === null) {
      setConversationTitle(generateTitleFromMessage(text));
    }

    const assistantId = generateId();
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
      let chunkCount = 0;

      // Use the streamMessage API for streaming responses
      for await (const chunk of api.streamMessage([
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: text }
      ], {
        provider: options.provider || 'openai',
        model: options.model,
        signal: abortControllerRef.current.signal,
      })) {
        chunkCount++;
        streamedContent += chunk;
        console.log(`[DEBUG] Received chunk ${chunkCount}:`, chunk.substring(0, 50));

        // Batch streaming updates using requestAnimationFrame
        pendingContentRef.current = streamedContent;
        if (!animationFrameRef.current) {
          animationFrameRef.current = requestAnimationFrame(() => {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId ? { ...msg, content: pendingContentRef.current } : msg
            ));
            animationFrameRef.current = null;
          });
        }
      }
      console.log('[DEBUG] Stream completed, total chunks:', chunkCount, 'total content:', streamedContent.length);

      // Flush any pending content
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        setMessages(prev => prev.map(msg =>
          msg.id === assistantId ? { ...msg, content: pendingContentRef.current } : msg
        ));
      }

      let conversationIdToUse = activeConversationId;

      // If this was the first message and no conversation exists yet, create one
      if (isFirstMessage.current && activeConversationId === null) {
        try {
          const conversationData = await api.createConversation(generateTitleFromMessage(text));
          const newConversationId = conversationData.conversation?.id || conversationData.id;

          if (newConversationId) {
            conversationIdToUse = newConversationId;
            setActiveConversationId(newConversationId);
            // Update URL without reload
            navigate(`/chat/${newConversationId}`, { replace: true });
          }
        } catch (err) {
          console.error('Failed to create conversation:', err);
        }
      }

      // Save both user and assistant messages to the conversation
      if (conversationIdToUse) {
        try {
          // Save user message
          await api.post(`/conversations/${conversationIdToUse}/messages`, {
            role: 'user',
            content: text,
            model: options.model,
            provider: options.provider || 'openai'
          });

          // Save assistant message
          await api.post(`/conversations/${conversationIdToUse}/messages`, {
            role: 'assistant',
            content: streamedContent,
            model: options.model,
            provider: options.provider || 'openai'
          });
        } catch (err) {
          console.error('Failed to save messages:', err);
        }
      }

      // If no chunks received, show a message
      if (chunkCount === 0) {
        console.warn('[DEBUG] No chunks received from stream - provider may be misconfigured');
      }
      isFirstMessage.current = false;
    } catch (error) {
      console.error('[DEBUG] handleSend error:', error);
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
  }, [messages, activeConversationId, navigate]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const handleNewChat = useCallback(() => {
    navigate('/chat', { replace: true });
  }, [navigate]);

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
            <h1 className="chat-title">{conversationTitle}</h1>
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
            {messages.length === 0 && !isStreaming && (
              <div className="welcome-state">
                <h1 className="welcome-title">Welcome to Galactus AI</h1>
              </div>
            )}

            {/* Messages */}
            {memoizedMessages.map((message, index) => (
              <MemoizedChatMessage
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