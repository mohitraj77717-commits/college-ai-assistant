import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="status-dot online" style={{ width: '16px', height: '16px', margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--slate-600)', fontSize: '0.9rem' }}>Verifying authentication credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="container" style={{ maxWidth: '600px', marginTop: '3rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <ShieldAlert size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
            Access Restricted (Role Mismatch)
          </h2>
          <p style={{ color: 'var(--slate-600)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            You are authenticated as <strong>{user.name}</strong> with the <strong>{user.role}</strong> role.
            This area requires one of the following roles: <strong>{allowedRoles.join(', ')}</strong>.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link to="/" className="btn btn-secondary">
              <ArrowLeft size={14} /> Back to Overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
