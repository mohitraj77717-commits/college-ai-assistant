import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Briefcase, AlertCircle, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Artificial Intelligence & Machine Learning',
  'Electronics & Communication Engineering',
  'Mechanical Engineering',
  'Basic Sciences & Humanities',
  'Management & Business Studies',
];

export default function RegisterTeacher() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: DEPARTMENTS[0],
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { registerTeacher } = useAuth();

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
      const res = await registerTeacher({
        name: formData.name,
        email: formData.email,
        department: formData.department,
        password: formData.password,
      });

      if (res.success) {
        setSubmitted(true);
      } else {
        setErrorMessage(res.error || 'Teacher registration failed.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="container" style={{ maxWidth: '580px', margin: '3rem auto' }}>
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--success-bg)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem' }}>
            Registration Submitted for Approval!
          </h2>

          <div style={{
            background: 'var(--warning-bg)',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            margin: '1.25rem 0',
            textAlign: 'left',
            color: '#92400e',
            fontSize: '0.875rem'
          }}>
            <strong>Important Policy:</strong> Under university governance rules, all new faculty and in-charge accounts require explicit administrator verification before platform access is granted.
          </div>

          <p style={{ color: 'var(--slate-600)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Your registration for <strong>{formData.name}</strong> ({formData.email}) is currently in the administrator review queue. Once approved, you will be able to log in to post announcements and upload course notices.
          </p>

          <Link to="/login" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
            Return to Sign In <ArrowRight size={16} />
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
            background: 'linear-gradient(135deg, #d97706, #b45309)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem'
          }}>
            <Briefcase size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Faculty & In-charge Registration
          </h1>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Register to submit official announcements, event circulars, and notices
          </p>
        </div>

        {/* Governance Notice */}
        <div style={{
          background: 'var(--slate-50)',
          border: '1px solid var(--slate-200)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem',
          fontSize: '0.825rem',
          color: 'var(--slate-700)',
          display: 'flex',
          gap: '0.6rem',
          alignItems: 'center'
        }}>
          <ShieldCheck size={18} color="var(--primary-600)" style={{ flexShrink: 0 }} />
          <span>New teacher registrations require Administrator approval before first login.</span>
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
              Full Name with Title
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Dr. Priya Raman"
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
              Official Institutional Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. priya.raman@university.edu"
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

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
              Academic Department
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1px solid var(--slate-300)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                background: 'white'
              }}
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
                Password (min. 6 characters)
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Choose password"
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
                placeholder="Confirm password"
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
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', background: '#d97706' }}
          >
            {loading ? 'Submitting Application...' : 'Submit Teacher Registration'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--slate-600)' }}>
          Already have an approved account?{' '}
          <Link to="/login" style={{ color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'none' }}>
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
