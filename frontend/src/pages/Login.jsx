import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Mail, Lock, LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      showToast('Please fill in all fields', 'warning');
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      showToast('Welcome back!', 'success');
      navigate('/');
    } else {
      showToast(result.message || 'Login failed. Check your credentials.', 'error');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <h2>Secure Login</h2>
          <p>Access your document intelligence dashboard</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '1rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--color-text-muted)' 
                }} 
              />
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.8rem' }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '1rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--color-text-muted)' 
                }} 
              />
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.8rem' }}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={submitting}
          >
            {submitting ? (
              <span className="typing-indicator" style={{ background: 'transparent', border: 'none' }}>
                <span className="dot" style={{ backgroundColor: '#fff' }}></span>
                <span className="dot" style={{ backgroundColor: '#fff' }}></span>
                <span className="dot" style={{ backgroundColor: '#fff' }}></span>
              </span>
            ) : (
              <>
                <LogIn size={18} />
                <span>Log In</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
