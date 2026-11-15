import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Briefcase, FileUp, CheckCircle2, Clock, AlertTriangle, Layers } from 'lucide-react';

export default function TeacherDashboard() {
  const { user } = useAuth();

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      {/* Teacher Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #78350f 0%, #b45309 60%, #d97706 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        color: 'white',
        marginBottom: '1.5rem',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.18)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            <Briefcase size={14} /> Faculty & In-Charge Portal
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Welcome, {user?.name}!
          </h1>
          <p style={{ color: '#fed7aa', fontSize: '0.95rem' }}>
            Department: <strong>{user?.department || 'Academic Department'}</strong>
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(8px)', textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#fef3c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Account Status
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fef08a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={16} /> Approved & Active
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Phase 3 Feature Preview: Announcement Submission */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon amber">
                <FileUp size={18} />
              </div>
              <div>
                <div className="card-title">Submit Notice or Event</div>
                <div className="card-subtitle">Administrator Review Workflow</div>
              </div>
            </div>
            <span className="badge badge-info">Phase 3</span>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.6, marginBottom: '1rem' }}>
            As an approved teacher, you will be able to submit event circulars, competitions, and official PDF documents.
            Submissions are queued for administrator review before being published to students.
          </p>

          <div style={{ background: 'var(--slate-50)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)', fontSize: '0.85rem', color: 'var(--slate-700)' }}>
            <strong>Governance Notice:</strong> Teachers cannot publish unapproved notices directly. The administrator reviews all submissions to verify accuracy.
          </div>
        </div>

        {/* Phase 3 Feature Preview: Submission Tracker */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon blue">
                <Clock size={18} />
              </div>
              <div>
                <div className="card-title">My Submissions Status</div>
                <div className="card-subtitle">Review & Feedback Tracking</div>
              </div>
            </div>
            <span className="badge badge-info">Phase 3</span>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.6, marginBottom: '1rem' }}>
            Track the approval status of your past submissions and view administrator feedback if a submission is requested for changes.
          </p>

          <div style={{ background: 'var(--slate-50)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--slate-300)', textAlign: 'center', color: 'var(--slate-500)', fontSize: '0.85rem' }}>
            No past submissions. You will be able to create new event drafts in Phase 3.
          </div>
        </div>
      </div>
    </div>
  );
}
