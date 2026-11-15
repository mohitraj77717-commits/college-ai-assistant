import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Sparkles, Bell, MessageSquare, Calendar, BookOpen, User } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      {/* Student Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.15)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            <GraduationCap size={14} /> Student Portal
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Welcome back, {user?.name}!
          </h1>
          <p style={{ color: '#c7d2fe', fontSize: '0.95rem' }}>
            Enrolled in <strong>{user?.course || 'Engineering'}</strong> &bull; Roll: <code>{user?.roll_number}</code>
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(8px)', textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Session Role
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
            Verified Student
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {/* Profile & Interests Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon blue">
                <User size={18} />
              </div>
              <div>
                <div className="card-title">Academic Profile</div>
                <div className="card-subtitle">Personalization Details</div>
              </div>
            </div>
            <span className="badge badge-success">Active</span>
          </div>

          <div style={{ fontSize: '0.875rem', color: 'var(--slate-700)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div><strong>Email:</strong> {user?.email}</div>
            <div><strong>Roll Number:</strong> {user?.roll_number}</div>
            <div><strong>Program:</strong> {user?.course}</div>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--slate-100)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.6rem' }}>
              <Sparkles size={15} color="var(--primary-600)" />
              My Campus Interests:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {user?.interests && user.interests.length > 0 ? (
                user.interests.map((tag) => (
                  <span key={tag} className="badge badge-info" style={{ fontWeight: 600 }}>
                    {tag}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>No interests selected yet.</span>
              )}
            </div>
          </div>
        </div>

        {/* Phase 3 Feature Preview: Announcements & Events */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon purple">
                <Calendar size={18} />
              </div>
              <div>
                <div className="card-title">Campus Events Feed</div>
                <div className="card-subtitle">Personalized for {user?.course}</div>
              </div>
            </div>
            <span className="badge badge-info">Phase 3</span>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.6, marginBottom: '1rem' }}>
            Announcements published by faculty and administrators matching your course and interests will automatically appear here.
          </p>

          <div style={{ background: 'var(--slate-50)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--slate-300)', textAlign: 'center', color: 'var(--slate-500)', fontSize: '0.85rem' }}>
            No published announcements yet. Check back once faculty posts event notices in Phase 3.
          </div>
        </div>

        {/* Phase 5 Feature Preview: AI Chatbot */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <div className="card-icon green">
                <MessageSquare size={18} />
              </div>
              <div>
                <div className="card-title">College AI Assistant</div>
                <div className="card-subtitle">Gemini File Search RAG</div>
              </div>
            </div>
            <span className="badge badge-info">Phase 5</span>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.6, marginBottom: '1rem' }}>
            Ask questions about college policies, exam dates, syllabus, and approved notices. Answers are retrieved directly from official indexed PDFs.
          </p>

          <div style={{ background: 'var(--slate-50)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--slate-300)', textAlign: 'center', color: 'var(--slate-500)', fontSize: '0.85rem' }}>
            Chatbot will be enabled once administrator indexes official PDFs in Phase 5.
          </div>
        </div>
      </div>
    </div>
  );
}
