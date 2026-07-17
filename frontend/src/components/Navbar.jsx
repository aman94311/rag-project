import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LogOut, FileText, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'success');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="brand">
          <FileText className="brand-icon" />
          <span>DocuMind RAG</span>
        </Link>

        {user && (
          <div className="nav-user">
            <div className="user-tag">
              <User size={14} />
              <span>{user.name}</span>
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
