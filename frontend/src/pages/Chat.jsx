import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  ArrowLeft, 
  Send, 
  BookOpen, 
  Calendar, 
  User, 
  Tag, 
  ChevronDown, 
  ChevronUp, 
  Info 
} from 'lucide-react';

const Chat = () => {
  const { documentId } = useParams();
  const { token, API_URL } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [documentInfo, setDocumentInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Track open citations (stores index or unique key of open citation panels)
  const [openCitations, setOpenCitations] = useState({});
  const [showDocInfoMobile, setShowDocInfoMobile] = useState(false);

  const chatFeedEndRef = useRef(null);

  useEffect(() => {
    fetchDocumentDetails();
    fetchChatHistory();
  }, [documentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const scrollToBottom = () => {
    chatFeedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchDocumentDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await response.json();
      if (resData.success) {
        const doc = resData.data.find(d => d._id === documentId);
        if (doc) {
          setDocumentInfo(doc);
        } else {
          showToast('Document not found.', 'error');
          navigate('/');
        }
      }
    } catch (err) {
      showToast('Could not fetch document details.', 'error');
    }
  };

  const fetchChatHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await fetch(`${API_URL}/chat/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await response.json();
      if (resData.success) {
        setMessages(resData.data);
      }
    } catch (err) {
      showToast('Could not load chat history.', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const userText = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistically add user message to layout (we will reload from response)
    const tempUserMsg = {
      _id: 'temp_user',
      question: userText,
      answer: null,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await fetch(`${API_URL}/chat/${documentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ question: userText })
      });
      const resData = await response.json();

      if (resData.success) {
        // Replace temp msg with actual saved message
        setMessages(prev => prev.map(m => m._id === 'temp_user' ? resData.data : m));
      } else {
        showToast(resData.message || 'Failed to get response.', 'error');
        // Remove temp message on error
        setMessages(prev => prev.filter(m => m._id !== 'temp_user'));
      }
    } catch (err) {
      showToast('Connection timed out. Please try again.', 'error');
      setMessages(prev => prev.filter(m => m._id !== 'temp_user'));
    } finally {
      setSending(false);
    }
  };

  const toggleCitation = (msgId) => {
    setOpenCitations(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  return (
    <div className="chat-workspace">
      {/* Sidebar - Document Summary & Attributes */}
      <aside className={`chat-sidebar ${showDocInfoMobile ? 'show' : ''}`}>
        <button 
          className="btn btn-secondary" 
          onClick={() => navigate('/')}
          style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-start' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Docs</span>
        </button>

        {documentInfo ? (
          <>
            <h2 className="sidebar-title" title={documentInfo.fileName}>{documentInfo.fileName}</h2>
            <div className="user-tag" style={{ width: 'fit-content', marginBottom: '1.5rem' }}>
              <BookOpen size={12} />
              <span>{documentInfo.pageCount} Pages</span>
            </div>

            <div className="sidebar-section">
              <h4 className="sidebar-section-title">AI Summary</h4>
              <p style={{ color: 'var(--color-text-sub)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                {documentInfo.summary || 'Extracting summary features...'}
              </p>
            </div>

            {documentInfo.keywords?.length > 0 && (
              <div className="sidebar-section">
                <h4 className="sidebar-section-title">Keywords</h4>
                <div className="ai-tags-list">
                  {documentInfo.keywords.map((kw, i) => (
                    <span key={i} className="ai-tag">
                      <Tag size={10} style={{ marginRight: '0.2rem' }} />
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {documentInfo.importantDates?.length > 0 && (
              <div className="sidebar-section">
                <h4 className="sidebar-section-title">Key Dates</h4>
                {documentInfo.importantDates.map((date, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--color-text-sub)', marginTop: '0.3rem' }}>
                    <Calendar size={12} style={{ flexShrink: 0, marginTop: '0.1rem', color: 'var(--color-primary)' }} />
                    <span>{date}</span>
                  </div>
                ))}
              </div>
            )}

            {documentInfo.importantNames?.length > 0 && (
              <div className="sidebar-section">
                <h4 className="sidebar-section-title">Key Entities</h4>
                {documentInfo.importantNames.map((name, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--color-text-sub)', marginTop: '0.3rem' }}>
                    <User size={12} style={{ flexShrink: 0, marginTop: '0.1rem', color: 'var(--color-primary)' }} />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading doc info...</p>
        )}
      </aside>

      {/* Main Chat Panel */}
      <main className="chat-main">
        {/* Chat Header */}
        <header className="chat-header">
          <div>
            <h3 title={documentInfo?.fileName}>{documentInfo?.fileName || 'Document Chat'}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>Connected via Gemini RAG</span>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ display: 'none' }} // Visible on mobile for info toggle
            onClick={() => setShowDocInfoMobile(!showDocInfoMobile)}
          >
            <Info size={16} />
          </button>
        </header>

        {/* Messages Feed */}
        <section className="chat-feed">
          {loadingHistory ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <div className="typing-indicator">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
              <BookOpen size={48} style={{ margin: '0 auto 1.2rem', color: 'var(--bg-tertiary)' }} />
              <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '0.5rem' }}>Ask a Question</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                Ask questions about this document. The model will look up matching passages and respond with page citations.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <React.Fragment key={msg._id}>
                {/* User Message */}
                <div className="chat-bubble-container bubble-user">
                  <div className="chat-bubble">
                    <p>{msg.question}</p>
                  </div>
                </div>

                {/* Bot Answer */}
                {msg.answer !== null && (
                  <div className="chat-bubble-container bubble-assistant">
                    <div className="chat-bubble">
                      <p style={{ whiteSpace: 'pre-line' }}>{msg.answer}</p>
                      
                      {/* Citations block */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="citations-wrapper">
                          <button 
                            className="ai-toggle-btn"
                            onClick={() => toggleCitation(msg._id)}
                            style={{ margin: 0 }}
                          >
                            {openCitations[msg._id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            <span style={{ fontSize: '0.78rem' }}>Verify Document Sources ({msg.citations.length})</span>
                          </button>

                          {openCitations[msg._id] && (
                            <div className="citations-list" style={{ marginTop: '0.6rem' }}>
                              {msg.citations.map((cite, i) => (
                                <div key={i} className="citation-card">
                                  <div className="citation-meta">
                                    Page {cite.page}, Paragraph {cite.paragraph}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', fontStyle: 'italic', lineHeight: 1.4 }}>
                                    "{cite.text}"
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))
          )}

          {/* Assistant Typing Loader */}
          {sending && (
            <div className="chat-bubble-container bubble-assistant">
              <div className="chat-bubble">
                <div className="typing-indicator" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={chatFeedEndRef} />
        </section>

        {/* Input Bar */}
        <section className="chat-input-wrapper">
          <form onSubmit={handleSend} className="chat-input-container">
            <textarea
              className="chat-input"
              rows="1"
              placeholder="Ask a question about this document..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              style={{ overflowY: 'auto' }}
            />
            <button 
              type="submit" 
              className="chat-send-btn"
              disabled={!inputText.trim() || sending}
            >
              <Send size={16} />
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default Chat;
