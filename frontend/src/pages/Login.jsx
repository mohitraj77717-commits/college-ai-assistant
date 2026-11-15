import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { GraduationCap, Briefcase, Shield, AlertCircle, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

export default function Login() {
  const [activeRole, setActiveRole] = useState('student'); // 'student' | 'teacher' | 'admin'
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingNotice, setPendingNotice] = useState(false);
  const [adminExists, setAdminExists] = useState(true);

  const { loginStudent, loginTeacher, loginAdmin, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'student') navigate('/student/dashboard');
      else if (user.role === 'teacher') navigate('/teacher/dashboard');
      else if (user.role === 'admin') navigate('/admin/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  // Check if admin is bootstrapped
  useEffect(() => {
    async function checkAdmin() {
      const res = await api.getAdminStatus();
      if (res.success && res.data) {
        setAdminExists(res.data.admin_exists);
      }
    }
    checkAdmin();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage('');
    setPendingNotice(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setPendingNotice(false);

    try {
      if (activeRole === 'student') {
        const res = await loginStudent({
          identifier: formData.identifier,
          password: formData.password,
        });
        if (res.success) {
          navigate('/student/dashboard');
        } else {
          setErrorMessage(res.error || 'Student login failed. Check email/roll number and password.');
        }
      } else if (activeRole === 'teacher') {
        const res = await loginTeacher({
          email: formData.identifier,
          password: formData.password,
        });
        if (res.success) {
          navigate('/teacher/dashboard');
        } else {
          if (res.isPending) {
            setPendingNotice(true);
          }
          setErrorMessage(res.error || 'Teacher login failed.');
        }
      } else if (activeRole === 'admin') {
        const res = await loginAdmin({
          email: formData.identifier,
          password: formData.password,
        });
        if (res.success) {
          navigate('/admin/dashboard');
        } else {
          setErrorMessage(res.error || 'Administrator login failed.');
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '520px', margin: '2.5rem auto' }}>
      <div className="card" style={{ padding: '2rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem'
          }}>
            <GraduationCap size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Welcome to CampusAI
          </h1>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Select your university role to sign in
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          background: 'var(--slate-100)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          gap: '4px',
          marginBottom: '1.5rem'
        }}>
          <button
            type="button"
            onClick={() => { setActiveRole('student'); setErrorMessage(''); setPendingNotice(false); }}
            style={{
              padding: '0.6rem 0.5rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: activeRole === 'student' ? 'white' : 'transparent',
              color: activeRole === 'student' ? 'var(--primary-700)' : 'var(--slate-600)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeRole === 'student' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <GraduationCap size={15} /> Student
          </button>

          <button
            type="button"
            onClick={() => { setActiveRole('teacher'); setErrorMessage(''); setPendingNotice(false); }}
            style={{
              padding: '0.6rem 0.5rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: activeRole === 'teacher' ? 'white' : 'transparent',
              color: activeRole === 'teacher' ? 'var(--primary-700)' : 'var(--slate-600)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeRole === 'teacher' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Briefcase size={15} /> Teacher
          </button>

          <button
            type="button"
            onClick={() => { setActiveRole('admin'); setErrorMessage(''); setPendingNotice(false); }}
            style={{
              padding: '0.6rem 0.5rem',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              background: activeRole === 'admin' ? 'white' : 'transparent',
              color: activeRole === 'admin' ? 'var(--primary-700)' : 'var(--slate-600)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: activeRole === 'admin' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Shield size={15} /> Admin
          </button>
        </div>

        {/* Admin Bootstrap Alert if no admin created yet */}
        {activeRole === 'admin' && !adminExists && (
          <div style={{
            background: 'var(--warning-bg)',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: '#92400e'
          }}>
            <strong>Initial Setup Required:</strong> No administrator account exists yet.
            <div style={{ marginTop: '0.5rem' }}>
              <Link to="/admin-setup" className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                Run Initial Admin Setup <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Pending Teacher Approval Callout */}
        {pendingNotice && (
          <div style={{
            background: 'var(--warning-bg)',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: '#92400e',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start'
          }}>
            <Clock size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Account Pending Administrator Approval</strong>
              <p style={{ marginTop: '0.25rem', lineHeight: 1.5 }}>
                Your teacher account was registered successfully, but requires approval from an administrator before you can sign in.
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && !pendingNotice && (
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

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
              {activeRole === 'student' ? 'College Email or Roll Number' : 'Official Email Address'}
            </label>
            <input
              type={activeRole === 'student' ? 'text' : 'email'}
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              placeholder={activeRole === 'student' ? 'e.g. CS2026-001 or student@example.com' : 'e.g. name@university.edu'}
              required
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                border: '1px solid var(--slate-300)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                border: '1px solid var(--slate-300)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
          >
            {loading ? 'Authenticating...' : `Sign in as ${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}`}
          </button>
        </form>

        {/* Footer Links based on Role */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--slate-200)', textAlign: 'center', fontSize: '0.85rem', color: 'var(--slate-600)' }}>
          {activeRole === 'student' && (
            <p>
              New student?{' '}
              <Link to="/register/student" style={{ color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'none' }}>
                Create student account & select course
              </Link>
            </p>
          )}

          {activeRole === 'teacher' && (
            <p>
              New faculty or in-charge?{' '}
              <Link to="/register/teacher" style={{ color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'none' }}>
                Register for teacher account
              </Link>
            </p>
          )}

          {activeRole === 'admin' && (
            <p>
              Administrator setup?{' '}
              <Link to="/admin-setup" style={{ color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'none' }}>
                Initial Administrator Bootstrap Setup
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
