import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Briefcase,
  FileUp,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  Upload,
  Calendar,
  ExternalLink,
  MessageSquare,
  FileText
} from 'lucide-react';

const COURSES = [
  'All',
  'B.Tech Computer Science & Engineering (AI & ML)',
  'B.Tech Computer Science & Engineering',
  'B.Tech Electronics & Communication',
  'B.Tech Data Science & Analytics',
  'B.Tech Robotics & Automation',
  'M.Tech Computer Science',
];

const CATEGORIES = [
  { id: 'ai-ml', label: 'AI & Machine Learning' },
  { id: 'coding', label: 'Coding / Competitive Programming' },
  { id: 'robotics', label: 'Robotics & Hardware' },
  { id: 'cultural', label: 'Cultural & Arts Events' },
  { id: 'academic', label: 'Academic & Examination Notices' },
  { id: 'general', label: 'General University Announcement' },
];

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'history'
  const [submissions, setSubmissions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'coding',
    course: 'All',
    event_date: '',
    deadline: '',
    registration_link: '',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchSubmissions = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getTeacherSubmissions();
      if (res.success) {
        setSubmissions(res.data?.submissions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Only PDF documents (.pdf) are allowed.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('category', formData.category);
      payload.append('course', formData.course);
      payload.append('description', formData.description);
      if (formData.event_date) payload.append('event_date', formData.event_date);
      if (formData.deadline) payload.append('deadline', formData.deadline);
      if (formData.registration_link) payload.append('registration_link', formData.registration_link);
      if (selectedFile) payload.append('document', selectedFile);

      const res = await api.submitTeacherAnnouncement(payload);

      if (res.success) {
        setSuccessMessage('Announcement and notice submitted successfully! Awaiting administrator approval.');
        setFormData({
          title: '',
          category: 'coding',
          course: 'All',
          event_date: '',
          deadline: '',
          registration_link: '',
          description: '',
        });
        setSelectedFile(null);
        fetchSubmissions();
        setActiveTab('history');
      } else {
        setErrorMessage(res.error || 'Submission failed.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error occurred while submitting notice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      {/* Teacher Banner */}
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

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'submit' ? 'active' : ''}`}
          onClick={() => setActiveTab('submit')}
        >
          <FileUp size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
          Submit Announcement & Notice
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => { setActiveTab('history'); fetchSubmissions(); }}
        >
          <Clock size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
          My Submissions & Status ({submissions.length})
        </button>
      </div>

      {/* Alerts */}
      {successMessage && (
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
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
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
          <span>{errorMessage}</span>
        </div>
      )}

      {/* TAB 1: Submit Form */}
      {activeTab === 'submit' && (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              Create New Event or Notice Draft
            </h2>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Submissions require Administrator approval before being published to the student portal.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
                Announcement / Notice Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Annual University AI & ML Hackathon 2026"
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
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
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
                  Target Academic Course
                </label>
                <select
                  name="course"
                  value={formData.course}
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
                  {COURSES.map((c) => (
                    <option key={c} value={c}>
                      {c === 'All' ? 'All College Courses' : c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
                  Event Date (optional)
                </label>
                <input
                  type="date"
                  name="event_date"
                  value={formData.event_date}
                  onChange={handleChange}
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
                  Registration Deadline (optional)
                </label>
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
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
                  Registration Link (optional)
                </label>
                <input
                  type="url"
                  name="registration_link"
                  value={formData.registration_link}
                  onChange={handleChange}
                  placeholder="https://forms.gle/... or event link"
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

            {/* Document PDF Upload Zone */}
            <div style={{ marginBottom: '1.25rem', padding: '1.25rem', background: 'var(--slate-50)', border: '1px dashed var(--slate-300)', borderRadius: 'var(--radius-md)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
                <Upload size={16} color="var(--primary-600)" />
                Attach Official PDF Circular / Notice (optional)
              </label>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginBottom: '0.75rem' }}>
                Upload official timetable, guidelines, syllabus or flyer (.pdf format, max 16MB).
              </p>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                style={{ fontSize: '0.85rem' }}
              />
              {selectedFile && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--primary-700)', fontWeight: 600 }}>
                  Selected PDF: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
                Full Description & Details *
              </label>
              <textarea
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide event details, schedule, eligibility rules, prizes, or academic instructions..."
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--slate-300)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem', background: '#b45309' }}
            >
              {submitting ? 'Submitting to Administrator...' : 'Submit Notice for Administrator Approval'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: Submissions Tracker */}
      {activeTab === 'history' && (
        <div className="section-box" style={{ marginTop: 0 }}>
          <div className="section-header">
            <div className="section-heading">
              <Clock size={20} color="var(--primary-600)" />
              My Notice Submissions & Review History
            </div>
            <button
              onClick={fetchSubmissions}
              disabled={loadingHistory}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              <RefreshCw size={12} className={loadingHistory ? 'spin' : ''} /> Refresh
            </button>
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--slate-500)' }}>
              Loading submission history...
            </div>
          ) : submissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--slate-500)' }}>
              <FileText size={32} color="var(--slate-400)" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.25rem' }}>
                No Submissions Yet
              </h3>
              <p style={{ fontSize: '0.85rem' }}>
                You have not submitted any event notices or circulars yet. Use the "Submit Announcement" tab above.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {submissions.map((sub) => {
                const isPending = sub.submission_status === 'pending';
                const isApproved = sub.submission_status === 'approved';
                const isRejected = sub.submission_status === 'rejected';

                return (
                  <div
                    key={sub.id}
                    style={{
                      border: `1px solid ${isApproved ? '#bbf7d0' : isRejected ? '#fecaca' : '#fde68a'}`,
                      background: isApproved ? '#f0fdf4' : isRejected ? '#fef2f2' : '#fffbeb',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                            {sub.category}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                            Course: {sub.course}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                          {sub.title}
                        </h3>
                      </div>

                      <span
                        className={`badge ${isApproved ? 'badge-success' : isRejected ? 'badge-error' : 'badge-warning'}`}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                      >
                        {isApproved && <CheckCircle2 size={13} />}
                        {isRejected && <XCircle size={13} />}
                        {isPending && <Clock size={13} />}
                        {isApproved ? 'Approved & Published' : isRejected ? 'Rejected by Admin' : 'Pending Review'}
                      </span>
                    </div>

                    <p style={{ color: 'var(--slate-700)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                      {sub.description}
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--slate-500)', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      {sub.event_date && <span>Event: <strong>{sub.event_date}</strong></span>}
                      {sub.deadline && <span style={{ color: '#b45309' }}>Deadline: <strong>{sub.deadline}</strong></span>}
                      <span>Submitted: {sub.submitted_at}</span>
                      {sub.document_path && (
                        <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>
                          Attached Notice PDF included
                        </span>
                      )}
                    </div>

                    {/* Administrator Feedback Box */}
                    {sub.admin_feedback && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.75rem 1rem',
                        background: isRejected ? '#fee2e2' : 'white',
                        border: `1px solid ${isRejected ? '#fca5a5' : '#e2e8f0'}`,
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem'
                      }}>
                        <strong style={{ color: isRejected ? '#991b1b' : '#15803d' }}>
                          Administrator Remark / Feedback:
                        </strong>
                        <div style={{ color: 'var(--slate-700)', marginTop: '0.2rem' }}>
                          {sub.admin_feedback}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
