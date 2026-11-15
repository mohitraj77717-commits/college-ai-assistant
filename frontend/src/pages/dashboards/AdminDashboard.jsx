import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Shield, Users, CheckCircle2, XCircle, Clock, RefreshCw, AlertCircle, FileText, Upload, Database } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teachersRes, statsRes] = await Promise.all([
        api.getPendingTeachers(),
        api.getAdminStats()
      ]);

      if (teachersRes.success) {
        setPendingTeachers(teachersRes.data?.teachers || []);
      } else {
        setError(`Failed to load pending teachers: ${teachersRes.error}`);
      }

      if (statsRes.success) {
        setStats(statsRes.data?.stats || null);
      }
    } catch (err) {
      setError(err.message || 'Error fetching administrator dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleApprove = async (teacherId, teacherName) => {
    setActionLoading(teacherId);
    setMessage(null);
    setError(null);
    try {
      const res = await api.approveTeacher(teacherId);
      if (res.success) {
        setMessage(`Successfully approved ${teacherName}. They can now sign in.`);
        fetchAdminData();
      } else {
        setError(res.error || 'Failed to approve teacher account.');
      }
    } catch (err) {
      setError(err.message || 'Error during approval.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (teacherId, teacherName) => {
    setActionLoading(teacherId);
    setMessage(null);
    setError(null);
    try {
      const res = await api.rejectTeacher(teacherId);
      if (res.success) {
        setMessage(`Rejected application for ${teacherName}.`);
        fetchAdminData();
      } else {
        setError(res.error || 'Failed to reject teacher application.');
      }
    } catch (err) {
      setError(err.message || 'Error during rejection.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      {/* Admin Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)',
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
            <Shield size={14} /> University Administration Control Center
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Administrator: {user?.name}
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
            {user?.email} &bull; Full Administrative Permissions
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="btn btn-secondary"
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh Records'}
        </button>
      </div>

      {/* Success / Error Messages */}
      {message && (
        <div style={{
          background: 'var(--success-bg)',
          border: '1px solid #bbf7d0',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem',
          color: '#166534',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{
          background: 'var(--error-bg)',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem',
          color: '#b91c1c',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* System Statistics Cards */}
      <div className="grid-cards" style={{ marginBottom: '1.5rem', marginTop: 0 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Enrolled Students</div>
            <Users size={18} color="var(--primary-600)" />
          </div>
          <div className="card-value">{stats ? stats.students : 0}</div>
          <div className="card-subtitle">Active student profiles in SQLite</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Pending Teachers</div>
            <Clock size={18} color="#d97706" />
          </div>
          <div className="card-value" style={{ color: (stats?.pending_teachers || 0) > 0 ? '#d97706' : 'var(--slate-900)' }}>
            {stats ? stats.pending_teachers : 0}
          </div>
          <div className="card-subtitle">Awaiting your approval below</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Approved Faculty</div>
            <CheckCircle2 size={18} color="var(--success)" />
          </div>
          <div className="card-value">{stats ? stats.approved_teachers : 0}</div>
          <div className="card-subtitle">Verified in-charges with posting rights</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Approved Notices</div>
            <FileText size={18} color="var(--primary-600)" />
          </div>
          <div className="card-value">{stats ? stats.published_announcements : 0}</div>
          <div className="card-subtitle">Published announcements</div>
        </div>
      </div>

      {/* Primary Phase 2 Feature: Teacher Approvals Queue */}
      <div className="section-box">
        <div className="section-header">
          <div className="section-heading">
            <Users size={20} color="var(--primary-600)" />
            Faculty & In-Charge Account Approval Queue
          </div>
          <span className="badge badge-warning">
            {pendingTeachers.length} Pending Review
          </span>
        </div>

        <p style={{ color: 'var(--slate-600)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          All new teacher accounts must be reviewed and approved by an administrator before they are permitted to log in or publish college notices.
        </p>

        {pendingTeachers.length === 0 ? (
          <div style={{
            background: 'var(--slate-50)',
            border: '1px dashed var(--slate-300)',
            borderRadius: 'var(--radius-md)',
            padding: '2.5rem',
            textAlign: 'center',
            color: 'var(--slate-500)'
          }}>
            <CheckCircle2 size={32} color="var(--success)" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.25rem' }}>
              All Caught Up!
            </h3>
            <p style={{ fontSize: '0.85rem' }}>
              There are no pending teacher registration requests at this time.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Faculty Name</th>
                  <th>Official Email</th>
                  <th>Department</th>
                  <th>Registered At</th>
                  <th style={{ textAlign: 'right' }}>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingTeachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{teacher.name}</div>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>{teacher.email}</code>
                    </td>
                    <td>
                      <span className="badge badge-info">{teacher.department}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                      {teacher.created_at || 'Recently'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleApprove(teacher.id, teacher.name)}
                          disabled={actionLoading === teacher.id}
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: 'var(--success)' }}
                        >
                          <CheckCircle2 size={14} />
                          {actionLoading === teacher.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(teacher.id, teacher.name)}
                          disabled={actionLoading === teacher.id}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
