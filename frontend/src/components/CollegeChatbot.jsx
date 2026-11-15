import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  Minimize2,
  Maximize2,
  BookOpen,
  Info,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  FileText
} from 'lucide-react';
import api from '../services/api';

export default function CollegeChatbot({ inline = false, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen || inline);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hello! I am your College AI Assistant. Ask me anything about examination rules, academic calendars, hackathons, or campus policies based on official university circulars.",
      sources: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatbotStatus, setChatbotStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const suggestedPrompts = [
    "What are the examination rules?",
    "When is the AI Hackathon deadline?",
    "What is the minimum attendance requirement?",
    "Where can I find the official academic calendar?"
  ];

  // Fetch RAG system status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const fetchStatus = async () => {
    try {
      setStatusLoading(true);
      const res = await api.getChatbotStatus();
      if (res.success && res.data) {
        setChatbotStatus(res.data);
      }
    } catch (err) {
      console.error("Failed to load chatbot status", err);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSendMessage = async (queryText = null) => {
    const textToSend = (queryText || inputValue).trim();
    if (!textToSend || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const res = await api.askChatbot({ message: textToSend });
      if (res.success && res.data) {
        const botMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: res.data.answer || "No response received.",
          sources: res.data.sources || [],
          mode: res.data.mode || 'standard',
          geminiConfigured: res.data.gemini_configured,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: res.error || "Sorry, I could not process your question at this moment. Please check your network connection.",
          sources: [],
          isError: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (err) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: "Error communicating with server: " + (err.message || "Unknown error"),
        sources: [],
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      // Auto focus back on input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: "Chat cleared. Ask me another question about official university circulars or policies!",
        sources: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Status badge calculation
  const getStatusBadge = () => {
    if (statusLoading) {
      return (
        <span style={{ fontSize: '0.725rem', color: 'var(--slate-400)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <RefreshCw size={10} className="spin" /> Checking AI...
        </span>
      );
    }
    if (!chatbotStatus?.gemini_configured) {
      return (
        <span style={{
          fontSize: '0.725rem',
          background: '#fef3c7',
          color: '#92400e',
          padding: '0.15rem 0.5rem',
          borderRadius: 'var(--radius-full)',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          Standby Mode
        </span>
      );
    }
    if (chatbotStatus?.indexed_documents_count === 0) {
      return (
        <span style={{
          fontSize: '0.725rem',
          background: '#e0f2fe',
          color: '#0369a1',
          padding: '0.15rem 0.5rem',
          borderRadius: 'var(--radius-full)',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          Awaiting Docs ({chatbotStatus.approved_documents_count || 0} approved)
        </span>
      );
    }
    return (
      <span style={{
        fontSize: '0.725rem',
        background: '#dcfce7',
        color: '#15803d',
        padding: '0.15rem 0.5rem',
        borderRadius: 'var(--radius-full)',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem'
      }}>
        <CheckCircle size={10} /> RAG Ready ({chatbotStatus?.indexed_documents_count} docs)
      </span>
    );
  };

  // The Chat Window UI
  const chatWindow = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: inline ? '520px' : '560px',
      maxHeight: '85vh',
      width: inline ? '100%' : '390px',
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      boxShadow: inline ? 'var(--shadow-sm)' : '0 20px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)',
      border: '1px solid var(--slate-200)',
      overflow: 'hidden',
      zIndex: inline ? 1 : 1000,
      transition: 'all 0.2s ease-in-out'
    }}>
      {/* Header */}
      <div style={{
        padding: '0.875rem 1.15rem',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Sparkles size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.925rem', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Campus AI Assistant
            </div>
            <div>{getStatusBadge()}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={handleClearChat}
            title="Reset conversation"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--slate-400)',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}
          >
            Clear
          </button>
          {!inline && (
            <button
              onClick={() => setIsOpen(false)}
              title="Close chat"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--slate-400)',
                cursor: 'pointer',
                padding: '0.35rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* RAG Information Strip */}
      <div style={{
        background: '#f8fafc',
        borderBottom: '1px solid var(--slate-200)',
        padding: '0.45rem 1rem',
        fontSize: '0.725rem',
        color: 'var(--slate-600)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <BookOpen size={12} color="var(--primary-600)" />
          Grounded in Approved Circulars & Documents
        </span>
        <button
          onClick={fetchStatus}
          title="Refresh AI document status"
          style={{ background: 'none', border: 'none', color: 'var(--primary-600)', cursor: 'pointer', padding: 0 }}
        >
          <RefreshCw size={11} className={statusLoading ? 'spin' : ''} />
        </button>
      </div>

      {/* Message List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        background: '#f8fafc'
      }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '100%'
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '0.75rem 0.95rem',
                borderRadius: msg.sender === 'user'
                  ? '16px 16px 4px 16px'
                  : '16px 16px 16px 4px',
                background: msg.sender === 'user'
                  ? 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%)'
                  : msg.isError
                    ? '#fef2f2'
                    : 'white',
                color: msg.sender === 'user'
                  ? 'white'
                  : msg.isError
                    ? '#991b1b'
                    : 'var(--slate-800)',
                boxShadow: msg.sender === 'user' ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                border: msg.isError ? '1px solid #fecaca' : msg.sender === 'user' ? 'none' : '1px solid var(--slate-200)',
                fontSize: '0.875rem',
                lineHeight: 1.45,
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap'
              }}
            >
              {msg.text}
            </div>

            {/* Document Citations / Sources */}
            {msg.sources && msg.sources.length > 0 && (
              <div style={{
                marginTop: '0.35rem',
                maxWidth: '85%',
                fontSize: '0.725rem',
                background: 'white',
                border: '1px solid var(--slate-200)',
                borderRadius: 'var(--radius-md)',
                padding: '0.4rem 0.65rem',
                color: 'var(--slate-600)'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary-700)' }}>
                  <FileText size={11} /> Referenced College Document(s):
                </div>
                {msg.sources.map((src, idx) => (
                  <div key={idx} style={{ color: 'var(--slate-700)', padding: '0.1rem 0' }}>
                    &bull; {src.title || src.filename}
                  </div>
                ))}
              </div>
            )}

            <span style={{ fontSize: '0.675rem', color: 'var(--slate-400)', marginTop: '0.2rem', padding: '0 0.25rem' }}>
              {msg.timestamp}
            </span>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem', color: 'var(--slate-500)', fontSize: '0.8rem' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--primary-600)',
              animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite'
            }} />
            Consulting approved college documents with Gemini...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts (Chips) */}
      {messages.length <= 2 && (
        <div style={{
          padding: '0.5rem 0.85rem',
          background: 'white',
          borderTop: '1px solid var(--slate-200)',
          display: 'flex',
          gap: '0.4rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              disabled={loading}
              style={{
                fontSize: '0.725rem',
                padding: '0.3rem 0.65rem',
                background: '#f1f5f9',
                border: '1px solid var(--slate-200)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--slate-700)',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => (e.target.style.background = '#e2e8f0')}
              onMouseLeave={(e) => (e.target.style.background = '#f1f5f9')}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <div style={{
        padding: '0.75rem 1rem',
        background: 'white',
        borderTop: '1px solid var(--slate-200)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask a question about campus circulars..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{
            flex: 1,
            padding: '0.65rem 0.85rem',
            border: '1px solid var(--slate-300)',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.85rem',
            fontFamily: 'inherit',
            outline: 'none',
            background: '#f8fafc'
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--primary-600)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--slate-300)')}
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputValue.trim() || loading}
          className="btn btn-primary"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
          title="Send query"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );

  // If rendered inline, return the window directly
  if (inline) {
    return chatWindow;
  }

  // Floating Launcher Mode
  return (
    <div style={{
      position: 'fixed',
      bottom: '1.75rem',
      right: '1.75rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '0.75rem'
    }}>
      {isOpen && chatWindow}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle College AI Chatbot"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary-600) 0%, #7c3aed 100%)',
          color: 'white',
          border: 'none',
          boxShadow: '0 10px 15px -3px rgba(37,99,235,0.4), 0 4px 6px -4px rgba(37,99,235,0.2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>
    </div>
  );
}
