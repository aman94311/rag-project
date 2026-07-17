import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Upload, 
  Search, 
  FileText, 
  Trash2, 
  MessageSquare, 
  Edit3, 
  Calendar, 
  User, 
  Tag, 
  ChevronDown, 
  ChevronUp, 
  Loader2 
} from 'lucide-react';

const Dashboard = () => {
  const { token, API_URL, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Upload States
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  
  // Rename Modal States
  const [renamingDoc, setRenamingDoc] = useState(null);
  const [newName, setNewName] = useState('');
  
  // Expanded AI trays tracking (stores document IDs that are expanded)
  const [expandedDocIds, setExpandedDocIds] = useState({});

  // Poll for processing documents
  useEffect(() => {
    fetchDocuments();
    
    // Set up an interval to refresh document list every 5 seconds if any doc is 'processing'
    const interval = setInterval(() => {
      setDocuments((prevDocs) => {
        const hasProcessing = prevDocs.some(doc => doc.status === 'processing');
        if (hasProcessing) {
          fetchDocumentsSilent();
        }
        return prevDocs;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await response.json();
      if (resData.success) {
        setDocuments(resData.data);
      } else {
        showToast(resData.message, 'error');
      }
    } catch (err) {
      showToast('Could not load documents from server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentsSilent = async () => {
    try {
      const response = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await response.json();
      if (resData.success) {
        setDocuments(resData.data);
      }
    } catch (err) {
      console.error('Silent doc reload failed:', err);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check extension
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      showToast('Only PDF and DOCX files are allowed.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadProgress(0);
    showToast('Starting file upload...', 'success');

    // Use XMLHttpRequest for tracking progress
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/documents/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        // Let's cap upload visual at 99% until backend responds
        setUploadProgress(percentComplete === 100 ? 99 : percentComplete);
      }
    };

    xhr.onload = () => {
      setUploading(false);
      setUploadProgress(0);
      
      try {
        const resData = JSON.parse(xhr.responseText);
        if (xhr.status === 201 && resData.success) {
          showToast('Document uploaded! Analyzing in background...', 'success');
          // Add to local documents state
          fetchDocumentsSilent();
        } else {
          showToast(resData.message || 'Upload failed.', 'error');
        }
      } catch (err) {
        showToast('Server returned an invalid response.', 'error');
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setUploadProgress(0);
      showToast('Connection error during upload.', 'error');
    };

    xhr.send(formData);
    // Reset file input value
    e.target.value = '';
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document? All chat logs and vectors will be permanently removed.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await response.json();

      if (resData.success) {
        showToast('Document deleted successfully', 'success');
        setDocuments(prev => prev.filter(doc => doc._id !== docId));
      } else {
        showToast(resData.message, 'error');
      }
    } catch (err) {
      showToast('Failed to delete document. Try again.', 'error');
    }
  };

  const openRenameModal = (doc) => {
    setRenamingDoc(doc);
    setNewName(doc.fileName);
  };

  const handleRename = async () => {
    if (!newName.trim()) {
      showToast('File name cannot be empty', 'warning');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/documents/${renamingDoc._id}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ fileName: newName })
      });
      const resData = await response.json();

      if (resData.success) {
        showToast('Document renamed successfully', 'success');
        setDocuments(prev => prev.map(d => d._id === renamingDoc._id ? { ...d, fileName: newName } : d));
        setRenamingDoc(null);
      } else {
        showToast(resData.message, 'error');
      }
    } catch (err) {
      showToast('Rename failed.', 'error');
    }
  };

  const toggleAITray = (id) => {
    setExpandedDocIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredDocs = documents.filter(doc => 
    doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="main-content" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {/* Welcome header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
          Welcome, <span style={{ color: 'var(--color-primary)' }}>{user?.name || 'User'}</span>
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginTop: '0.2rem' }}>
          Upload PDF/DOCX and ask anything. We extract knowledge and provide citations.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="upload-zone" onClick={handleUploadClick}>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="file-input" 
          accept=".pdf,.docx" 
          onChange={handleFileChange}
          disabled={uploading}
        />
        <Upload className="upload-icon" />
        <h3 className="upload-title">Drag & drop your document here, or click to browse</h3>
        <p className="upload-subtitle">Accepts PDF or DOCX files (No size limit)</p>
        
        {uploading && (
          <div className="upload-progress-container">
            <div className="progress-info">
              <span>Uploading document...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Dashboard Toolbar */}
      <div className="dashboard-header">
        <h1>Your Documents</h1>
        <div className="search-bar-container">
          <Search className="search-icon" />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search documents..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Document Grid Container */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <Loader2 className="spinning" style={{ animation: 'bounce 1.5s infinite', color: 'var(--color-primary)' }} />
          <span style={{ marginLeft: '1rem', color: 'var(--color-text-muted)' }}>Loading documents...</span>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <FileText size={48} style={{ margin: '0 auto 1rem', color: 'var(--bg-tertiary)' }} />
          <p>No documents found. Upload a file above to begin.</p>
        </div>
      ) : (
        <div className="documents-grid">
          {filteredDocs.map((doc) => {
            const isExpanded = expandedDocIds[doc._id];
            const formattedDate = new Date(doc.uploadDate).toLocaleDateString(undefined, {
              year: 'numeric', month: 'short', day: 'numeric'
            });

            return (
              <div key={doc._id} className="document-card glass-panel">
                <div>
                  <div className="doc-info-top">
                    <div className="doc-icon-container">
                      <FileText size={22} />
                    </div>
                    <div className="doc-meta">
                      <h3 className="doc-title" title={doc.fileName}>{doc.fileName}</h3>
                      <div className="doc-date">Uploaded on {formattedDate}</div>
                    </div>
                  </div>

                  {/* Document Stats Panel */}
                  <div className="doc-stats-grid">
                    <div className="stat-item">
                      <span className="stat-val">{doc.pageCount || 0}</span>
                      <span className="stat-lbl">Pages</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-val">{doc.questionsAsked || 0}</span>
                      <span className="stat-lbl">Questions</span>
                    </div>
                    <div className="stat-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className={`doc-status-badge status-${doc.status}`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>

                  {/* Phase 14 Auto AI features */}
                  {doc.status === 'processed' && (
                    <div className="ai-features-tray">
                      <button 
                        className="ai-toggle-btn"
                        onClick={() => toggleAITray(doc._id)}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        <span>AI Insights</span>
                      </button>

                      {isExpanded && (
                        <div className="ai-details">
                          <div className="ai-summary">
                            <strong>Summary:</strong> {doc.summary}
                          </div>
                          {doc.keywords && doc.keywords.length > 0 && (
                            <div className="ai-tags-list">
                              {doc.keywords.map((kw, i) => (
                                <span key={i} className="ai-tag">
                                  <Tag size={10} style={{ marginRight: '0.2rem' }} />
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                          {(doc.importantDates?.length > 0 || doc.importantNames?.length > 0) && (
                            <div className="ai-dates-names">
                              {doc.importantDates && doc.importantDates.length > 0 && (
                                <div className="ai-meta-sub">
                                  <Calendar size={12} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
                                  <strong>Key Dates:</strong> {doc.importantDates.join(', ')}
                                </div>
                              )}
                              {doc.importantNames && doc.importantNames.length > 0 && (
                                <div className="ai-meta-sub">
                                  <User size={12} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
                                  <strong>Key Entities:</strong> {doc.importantNames.join(', ')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="doc-actions">
                  <button 
                    className="btn btn-primary"
                    disabled={doc.status !== 'processed'}
                    onClick={() => navigate(`/chat/${doc._id}`)}
                  >
                    <MessageSquare size={16} />
                    <span>Chat</span>
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => openRenameModal(doc)}
                  >
                    <Edit3 size={14} />
                    <span>Rename</span>
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={() => handleDelete(doc._id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rename Modal Popup */}
      {renamingDoc && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h3 className="modal-title">Rename Document</h3>
            <div className="form-group">
              <label className="form-label">New File Name</label>
              <input 
                type="text"
                className="form-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setRenamingDoc(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleRename}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
