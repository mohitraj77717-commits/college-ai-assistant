import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Shield, KeyRound, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

export default function AdminSetup() {
  const [formData, setFormData] = useState({
    setup_key: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const { setupAdmin } = useAuth();
  const navigate = useNavigate();

  // Check if admin setup is already locked
  useEffect(() => {
    async function checkStatus() {
      const res = await api.getAdminStatus();
      if (res.success && res.data?.admin_exists) {
        setIsLocked(true);
      }
    }
    checkStatus();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await setupAdmin({
        setup_key: formData.setup_key,
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (res.success) {
        navigate('/admin/dashboard');
      } else {
        setErrorMessage(res.error || 'Administrator bootstrap setup failed.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (isLocked) {
    return (
      <div className="container" style={{ maxWidth: '560px', margin: '3rem auto' }}>
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
            Administrator Setup Locked
          </h2>
          <p style={{ color: 'var(--slate-600)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            An administrator account is already configured for this system. For security reasons, public administrator bootstrap registration is permanently locked.
          </p>
          <Link to="/login" className="btn btn-primary">
            Proceed to Administrator Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '580px', margin: '2rem auto' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4338ca, #312e81)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem'
          }}>
            <Shield size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Initial Administrator Bootstrap
          </h1>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            One-time secure configuration for the university platform administrator
          </p>
        </div>

        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem',
          fontSize: '0.825rem',
          color: '#1e40af',
          display: 'flex',
          gap: '0.6rem',
          alignItems: 'flex-start'
        }}>
          <KeyRound size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Bootstrap Security Token:</strong> Enter the <code>ADMIN_SETUP_KEY</code> configured in your <code>backend/.env</code> file (default in development: <code>university_bootstrap_admin_key_2026</code>).
          </div>
        </div>

        {errorMessage && (
          <div style={{
            background: 'var(--error-bg)',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
              Administrator Setup Token (from backend/.env)
            </label>
            <input
              type="password"
              name="setup_key"
              value={formData.setup_key}
              onChange={handleChange}
              placeholder="Enter ADMIN_SETUP_KEY"
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1px solid var(--slate-300)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
              Administrator Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Prof. Rajesh Gupta"
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1px solid var(--slate-300)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
              Administrator Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. admin@university.edu"
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1px solid var(--slate-300)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
                Master Password (min. 6 chars)
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Choose strong password"
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid var(--slate-300)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid var(--slate-300)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
          >
            {loading ? 'Initializing Administrator...' : 'Bootstrap Administrator Account'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--slate-600)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'none' }}>
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
