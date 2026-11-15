import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  FileText,
  Upload,
  Calendar,
  ExternalLink,
  MessageSquare,
  FileUp,
  Database,
  PlusCircle,
  Sparkles,
  Bot,
  UserPlus,
  Download,
  X
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
  { id: 'coding', label: 'Coding / Competitions' },
  { id: 'robotics', label: 'Robotics & Hardware' },
  { id: 'cultural', label: 'Cultural & Arts Events' },
  { id: 'academic', label: 'Academic Notices' },
  { id: 'general', label: 'General University Announcement' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('submissions'); // 'submissions' | 'documents' | 'teachers' | 'direct_post'
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [teacherSubmissions, setTeacherSubmissions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [chatbotStatus, setChatbotStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Reject Feedback Modal State
  const [rejectModalSubmission, setRejectModalSubmission] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  // Admin Direct PDF Upload State
  const [docUploadTitle, setDocUploadTitle] = useState('');
  const [docUploadFile, setDocUploadFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Admin Direct Announcement Form State
  const [directAnnounce, setDirectAnnounce] = useState({
    title: '',
    category: 'academic',
    course: 'All',
    event_date: '',
    deadline: '',
    registration_link: '',
    description: '',
  });
  const [postingAnnounce, setPostingAnnounce] = useState(false);

  // Bulk Student Import State (Phase 6)
  const [importFile, setImportFile] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewFilter, setPreviewFilter] = useState('all'); // 'all' | 'valid' | 'invalid'

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teachersRes, subsRes, docsRes, statsRes, botRes] = await Promise.all([
        api.getPendingTeachers(),
        api.getTeacherSubmissionsAdmin('pending'),
        api.getDocuments(),
        api.getAdminStats(),
        api.getChatbotStatus(),
      ]);

      if (teachersRes.success) setPendingTeachers(teachersRes.data?.teachers || []);
      if (subsRes.success) setTeacherSubmissions(subsRes.data?.submissions || []);
      if (docsRes.success) setDocuments(docsRes.data?.documents || []);
      if (statsRes.success) setStats(statsRes.data?.stats || null);
      if (botRes.success) setChatbotStatus(botRes.data || null);
    } catch (err) {
      setError(err.message || 'Error fetching administrator records');
    } finally {
      setLoading(false);
    }
  };

  const handleIndexDocument = async (docId, docTitle) => {
    setActionLoading(`index-${docId}`);
    setMessage(null);
    setError(null);
    try {
      const res = await api.indexDocument(docId);
      if (res.success) {
        if (res.data?.status === 'warning') {
          setMessage(res.data?.message || `Document "${docTitle}" approved, but GEMINI_API_KEY is not configured.`);
        } else {
          setMessage(`Document "${docTitle}" indexed successfully into Gemini File Search!`);
        }
        fetchAllData();
      } else {
        setError(res.error || 'Failed to index document.');
      }
    } catch (err) {
      setError(err.message || 'Error triggering document indexing.');
    } finally {
      setActionLoading(null);
    }
  };

  // --- Bulk Student Import Handlers (Phase 6) ---
  const handlePreviewImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    setPreviewLoading(true);
    setMessage(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await api.previewStudentImport(formData);
      if (res.success && res.data) {
        setPreviewData(res.data);
        setMessage(`File parsed successfully: ${res.data.valid_count} valid records, ${res.data.invalid_count} row(s) with errors.`);
      } else {
        setError(res.error || 'Failed to preview student file.');
      }
    } catch (err) {
      setError(err.message || 'Error processing file preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData || !previewData.valid_rows || previewData.valid_rows.length === 0) return;

    setConfirmingImport(true);
    setMessage(null);
    setError(null);
    try {
      const res = await api.confirmStudentImport({ students: previewData.valid_rows });
      if (res.success && res.data) {
        setMessage(`Successfully imported ${res.data.imported_count} student account(s) into the database!`);
        setPreviewData(null);
        setImportFile(null);
        fetchAllData();
      } else {
        setError(res.error || 'Failed to import student accounts.');
      }
    } catch (err) {
      setError(err.message || 'Error committing student import.');
    } finally {
      setConfirmingImport(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // --- Teacher Review Actions ---
  const handleApproveSubmission = async (submissionId, title) => {
    setActionLoading(`sub-${submissionId}`);
    setMessage(null);
    setError(null);
    try {
      const res = await api.reviewTeacherSubmission(submissionId, {
        action: 'approve',
        feedback: 'Approved by administrator.',
      });
      if (res.success) {
        setMessage(`Approved and published announcement: "${title}"!`);
        fetchAllData();
      } else {
        setError(res.error || 'Failed to approve submission.');
      }
    } catch (err) {
      setError(err.message || 'Error during review.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenRejectModal = (submission) => {
    setRejectModalSubmission(submission);
    setFeedbackText('Please update the details and resubmit for approval.');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalSubmission) return;
    setActionLoading(`sub-${rejectModalSubmission.id}`);
    setMessage(null);
    setError(null);
    try {
      const res = await api.reviewTeacherSubmission(rejectModalSubmission.id, {
        action: 'reject',
        feedback: feedbackText.trim() || 'Submission rejected by administrator.',
      });
      if (res.success) {
        setMessage(`Rejected submission "${rejectModalSubmission.title}" with feedback.`);
        setRejectModalSubmission(null);
        setFeedbackText('');
        fetchAllData();
      } else {
        setError(res.error || 'Failed to reject submission.');
      }
    } catch (err) {
      setError(err.message || 'Error during rejection.');
    } finally {
      setActionLoading(null);
    }
  };

  // --- Document Upload Actions ---
  const handleAdminDocUpload = async (e) => {
    e.preventDefault();
    if (!docUploadTitle || !docUploadFile) {
      setError('Please provide document title and select a PDF file.');
      return;
    }

    setUploadingDoc(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', docUploadTitle);
      formData.append('file', docUploadFile);
      formData.append('auto_approve', 'true');

      const res = await api.adminUploadDocument(formData);
      if (res.success) {
        setMessage(`Official document "${docUploadTitle}" uploaded and approved!`);
        setDocUploadTitle('');
        setDocUploadFile(null);
        fetchAllData();
      } else {
        setError(res.error || 'Document upload failed.');
      }
    } catch (err) {
      setError(err.message || 'Error uploading document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  // --- Teacher Approval Actions ---
  const handleApproveTeacher = async (teacherId, teacherName) => {
    setActionLoading(`teacher-${teacherId}`);
    try {
      const res = await api.approveTeacher(teacherId);
      if (res.success) {
        setMessage(`Approved ${teacherName}. They can now log in.`);
        fetchAllData();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectTeacher = async (teacherId, teacherName) => {
    setActionLoading(`teacher-${teacherId}`);
    try {
      const res = await api.rejectTeacher(teacherId);
      if (res.success) {
        setMessage(`Rejected teacher application for ${teacherName}.`);
        fetchAllData();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // --- Direct Announcement Posting ---
  const handleDirectAnnounceSubmit = async (e) => {
    e.preventDefault();
    setPostingAnnounce(true);
    setMessage(null);
    setError(null);

    try {
      const res = await api.adminCreateAnnouncement(directAnnounce);
      if (res.success) {
        setMessage(`Official announcement "${directAnnounce.title}" published!`);
        setDirectAnnounce({
          title: '',
          category: 'academic',
          course: 'All',
          event_date: '',
          deadline: '',
          registration_link: '',
          description: '',
        });
        fetchAllData();
      } else {
        setError(res.error || 'Failed to post announcement.');
      }
    } catch (err) {
      setError(err.message || 'Error posting announcement.');
    } finally {
      setPostingAnnounce(false);
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
          onClick={fetchAllData}
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

      {/* 5 Stats Cards */}
      <div className="grid-cards" style={{ marginBottom: '1.5rem', marginTop: 0 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Pending Submissions</div>
            <FileUp size={18} color="#d97706" />
          </div>
          <div className="card-value" style={{ color: teacherSubmissions.length > 0 ? '#d97706' : 'var(--slate-900)' }}>
            {teacherSubmissions.length}
          </div>
          <div className="card-subtitle">Teacher notices to review</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Pending Teachers</div>
            <Clock size={18} color="#d97706" />
          </div>
          <div className="card-value" style={{ color: pendingTeachers.length > 0 ? '#d97706' : 'var(--slate-900)' }}>
            {pendingTeachers.length}
          </div>
          <div className="card-subtitle">Faculty awaiting approval</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Published Events</div>
            <Calendar size={18} color="var(--primary-600)" />
          </div>
          <div className="card-value">{stats ? stats.published_announcements : 0}</div>
          <div className="card-subtitle">Visible on student feed</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Official Documents</div>
            <FileText size={18} color="var(--success)" />
          </div>
          <div className="card-value">{documents.length}</div>
          <div className="card-subtitle">Uploaded college PDFs</div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Enrolled Students</div>
            <Users size={18} color="var(--primary-600)" />
          </div>
          <div className="card-value">{stats ? stats.students : 0}</div>
          <div className="card-subtitle">Active student profiles</div>
        </div>
      </div>

      {/* Admin Feature Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          <FileUp size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
          Teacher Submissions Review ({teacherSubmissions.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <FileText size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
          College Documents Manager ({documents.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'teachers' ? 'active' : ''}`}
          onClick={() => setActiveTab('teachers')}
        >
          <Users size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
          Teacher Approvals ({pendingTeachers.length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'direct_post' ? 'active' : ''}`}
          onClick={() => setActiveTab('direct_post')}
        >
          <PlusCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
          Direct Announcement Publisher
        </button>

        <button
          className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <UserPlus size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
          Bulk Student Import (CSV / Excel)
        </button>
      </div>

      {/* TAB 1: Teacher Submissions Review Queue */}
      {activeTab === 'submissions' && (
        <div className="section-box" style={{ marginTop: 0 }}>
          <div className="section-header">
            <div className="section-heading">
              <FileUp size={20} color="var(--primary-600)" />
              Faculty Announcement & Notice Submissions
            </div>
            <span className="badge badge-warning">
              {teacherSubmissions.length} Pending Approval
            </span>
          </div>

          <p style={{ color: 'var(--slate-600)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Review announcements submitted by faculty members. Approving a submission automatically publishes it to the student portal. Rejecting allows you to give feedback.
          </p>

          {teacherSubmissions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--slate-500)', background: 'var(--slate-50)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--slate-300)' }}>
              <CheckCircle2 size={32} color="var(--success)" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.25rem' }}>
                No Pending Submissions
              </h3>
              <p style={{ fontSize: '0.85rem' }}>
                All teacher submissions have been reviewed. When teachers submit new notices, they will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {teacherSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    border: '1px solid var(--slate-200)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.5rem',
                    background: 'white',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                          {sub.category}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                          Target: <strong>{sub.course}</strong>
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                        {sub.title}
                      </h3>
                      <div style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginTop: '0.2rem' }}>
                        Submitted by: <strong>{sub.teacher_name}</strong> ({sub.teacher_department}) &bull; <code>{sub.teacher_email}</code>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleApproveSubmission(sub.id, sub.title)}
                        disabled={actionLoading === `sub-${sub.id}`}
                        className="btn btn-primary"
                        style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'var(--success)' }}
                      >
                        <CheckCircle2 size={15} />
                        {actionLoading === `sub-${sub.id}` ? 'Publishing...' : 'Approve & Publish'}
                      </button>
                      <button
                        onClick={() => handleOpenRejectModal(sub)}
                        disabled={actionLoading === `sub-${sub.id}`}
                        className="btn btn-secondary"
                        style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', color: '#dc2626', borderColor: '#fca5a5' }}
                      >
                        <XCircle size={15} />
                        Reject with Feedback
                      </button>
                    </div>
                  </div>

                  <p style={{ color: 'var(--slate-700)', fontSize: '0.9rem', lineHeight: 1.6, background: 'var(--slate-50)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                    {sub.description}
                  </p>

                  <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--slate-600)', flexWrap: 'wrap' }}>
                    {sub.event_date && <span>Event Date: <strong>{sub.event_date}</strong></span>}
                    {sub.deadline && <span style={{ color: '#b45309' }}>Deadline: <strong>{sub.deadline}</strong></span>}
                    {sub.registration_link && (
                      <a href={sub.registration_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-600)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        Registration Link <ExternalLink size={12} />
                      </a>
                    )}
                    {sub.document_path && (
                      <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>
                        Official Notice PDF Attached
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Official College Documents Manager */}
      {activeTab === 'documents' && (
        <div>
          {/* Gemini RAG Status Card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            color: 'white',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Sparkles size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Gemini File Search Knowledge Base
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    background: chatbotStatus?.gemini_configured ? '#166534' : '#854d0e',
                    color: chatbotStatus?.gemini_configured ? '#bbf7d0' : '#fef08a',
                    fontWeight: 600
                  }}>
                    {chatbotStatus?.gemini_configured ? 'API Key Active' : 'Standby Mode'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                  {chatbotStatus?.indexed_documents_count || 0} document(s) indexed for grounded chatbot answers &bull; {chatbotStatus?.approved_documents_count || documents.filter(d => d.approval_status === 'approved').length} approved
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#94a3b8', maxWidth: '320px', textAlign: 'right' }}>
              Approved PDFs are indexed into Gemini File Search stores so students receive strictly grounded answers with citations.
            </div>
          </div>

          {/* Direct PDF Upload Form */}
          <div className="section-box" style={{ marginTop: 0, marginBottom: '1.5rem' }}>
            <div className="section-header">
              <div className="section-heading">
                <Upload size={20} color="var(--primary-600)" />
                Direct Official College PDF Upload
              </div>
              <span className="badge badge-info">Administrator Only</span>
            </div>

            <p style={{ color: 'var(--slate-600)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Upload official university PDFs (academic calendar, rules, examination policies, syllabus). These documents are approved directly without requiring a teacher account, and can be indexed with one click into Gemini File Search.
            </p>

            <form onSubmit={handleAdminDocUpload} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
                  Document Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. University Examination Guidelines 2026"
                  value={docUploadTitle}
                  onChange={(e) => setDocUploadTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1px solid var(--slate-300)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
                  Select PDF Document *
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setDocUploadFile(e.target.files[0] || null)}
                  required
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.65rem 1rem', fontSize: '0.85rem' }}
                >
                  <Upload size={14} />
                  {uploadingDoc ? 'Uploading...' : 'Upload & Approve Document'}
                </button>
              </div>
            </form>
          </div>

          {/* Uploaded Documents Table */}
          <div className="section-box" style={{ marginTop: 0 }}>
            <div className="section-header">
              <div className="section-heading">
                <FileText size={20} color="var(--primary-600)" />
                College Documents Repository ({documents.length})
              </div>
              <span className="badge badge-info">Approval & Indexing Status</span>
            </div>

            {documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--slate-500)' }}>
                No college documents uploaded yet. Use the upload box above to add official PDFs.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Document Title</th>
                      <th>Original File</th>
                      <th>Uploader</th>
                      <th>Approval Status</th>
                      <th>Gemini Indexing</th>
                      <th>Uploaded At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <strong style={{ color: 'var(--slate-900)' }}>{doc.title}</strong>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>{doc.original_filename}</code>
                        </td>
                        <td>
                          <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
                            {doc.uploader_role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${doc.approval_status === 'approved' ? 'badge-success' : doc.approval_status === 'rejected' ? 'badge-error' : 'badge-warning'}`}>
                            {doc.approval_status === 'approved' && <CheckCircle2 size={12} />}
                            {doc.approval_status === 'rejected' && <XCircle size={12} />}
                            {doc.approval_status === 'pending' && <Clock size={12} />}
                            {doc.approval_status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${doc.indexing_status === 'indexed' ? 'badge-success' : doc.indexing_status === 'failed' ? 'badge-error' : 'badge-warning'}`}>
                            {doc.indexing_status === 'indexed' ? 'Indexed (Chatbot Ready)' : doc.indexing_status === 'failed' ? 'Indexing Failed' : 'Not Indexed'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                          {doc.created_at || 'Recently'}
                        </td>
                        <td>
                          {doc.approval_status === 'approved' ? (
                            doc.indexing_status === 'indexed' ? (
                              <button
                                onClick={() => handleIndexDocument(doc.id, doc.title)}
                                disabled={actionLoading === `index-${doc.id}`}
                                className="btn btn-secondary"
                                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                title="Re-index document into Gemini"
                              >
                                <RefreshCw size={11} className={actionLoading === `index-${doc.id}` ? 'spin' : ''} />
                                {actionLoading === `index-${doc.id}` ? 'Indexing...' : 'Re-Index'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleIndexDocument(doc.id, doc.title)}
                                disabled={actionLoading === `index-${doc.id}`}
                                className="btn btn-primary"
                                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                title="Index document with Gemini File Search"
                              >
                                <Sparkles size={12} />
                                {actionLoading === `index-${doc.id}` ? 'Indexing...' : 'Index with Gemini'}
                              </button>
                            )
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>Awaiting approval</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Teacher Approvals (from Phase 2) */}
      {activeTab === 'teachers' && (
        <div className="section-box" style={{ marginTop: 0 }}>
          <div className="section-header">
            <div className="section-heading">
              <Users size={20} color="var(--primary-600)" />
              Faculty Registration Approval Queue
            </div>
            <span className="badge badge-warning">
              {pendingTeachers.length} Pending
            </span>
          </div>

          {pendingTeachers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--slate-500)' }}>
              <CheckCircle2 size={32} color="var(--success)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 700, color: 'var(--slate-800)' }}>All Caught Up!</div>
              <div style={{ fontSize: '0.85rem' }}>No pending teacher applications.</div>
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
                    <th style={{ textAlign: 'right' }}>Admin Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTeachers.map((t) => (
                    <tr key={t.id}>
                      <td><strong>{t.name}</strong></td>
                      <td><code>{t.email}</code></td>
                      <td><span className="badge badge-info">{t.department}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>{t.created_at}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleApproveTeacher(t.id, t.name)}
                            disabled={actionLoading === `teacher-${t.id}`}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: 'var(--success)' }}
                          >
                            <CheckCircle2 size={13} /> Approve
                          </button>
                          <button
                            onClick={() => handleRejectTeacher(t.id, t.name)}
                            disabled={actionLoading === `teacher-${t.id}`}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#dc2626', borderColor: '#fca5a5' }}
                          >
                            <XCircle size={13} /> Reject
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
      )}

      {/* TAB 4: Direct Announcement Publisher */}
      {activeTab === 'direct_post' && (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              Publish Official Announcement as Administrator
            </h2>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Official administrative notices are published immediately to the student feed.
            </p>
          </div>

          <form onSubmit={handleDirectAnnounceSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
                Announcement Title *
              </label>
              <input
                type="text"
                placeholder="e.g. End-Semester Examination Schedule Announced"
                value={directAnnounce.title}
                onChange={(e) => setDirectAnnounce({ ...directAnnounce, title: e.target.value })}
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
                  value={directAnnounce.category}
                  onChange={(e) => setDirectAnnounce({ ...directAnnounce, category: e.target.value })}
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
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
                  Target Academic Course
                </label>
                <select
                  value={directAnnounce.course}
                  onChange={(e) => setDirectAnnounce({ ...directAnnounce, course: e.target.value })}
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
                    <option key={c} value={c}>{c === 'All' ? 'All College Courses' : c}</option>
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
                  value={directAnnounce.event_date}
                  onChange={(e) => setDirectAnnounce({ ...directAnnounce, event_date: e.target.value })}
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
                  Deadline (optional)
                </label>
                <input
                  type="date"
                  value={directAnnounce.deadline}
                  onChange={(e) => setDirectAnnounce({ ...directAnnounce, deadline: e.target.value })}
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
                  placeholder="https://..."
                  value={directAnnounce.registration_link}
                  onChange={(e) => setDirectAnnounce({ ...directAnnounce, registration_link: e.target.value })}
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

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
                Full Description & Details *
              </label>
              <textarea
                rows={4}
                value={directAnnounce.description}
                onChange={(e) => setDirectAnnounce({ ...directAnnounce, description: e.target.value })}
                placeholder="Official notice instructions, examination rules, or event circular..."
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
              disabled={postingAnnounce}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
            >
              {postingAnnounce ? 'Publishing...' : 'Publish Official Announcement Now'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: Bulk Student Import (Phase 6) */}
      {activeTab === 'import' && (
        <div>
          {/* Upload & Instructions Box */}
          <div className="section-box" style={{ marginTop: 0, marginBottom: '1.5rem' }}>
            <div className="section-header">
              <div className="section-heading">
                <UserPlus size={20} color="var(--primary-600)" />
                Student Bulk Import Engine (Pandas CSV & Excel Ingestion)
              </div>
              <span className="badge badge-info">Administrator Only</span>
            </div>

            <p style={{ color: 'var(--slate-600)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Upload a <code>.csv</code>, <code>.xlsx</code>, or <code>.xls</code> spreadsheet containing student enrollments.
              The Pandas import service validates required columns, flags duplicate roll numbers/emails, and generates personalized student preference profiles upon confirmation.
            </p>

            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--slate-200)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1.15rem',
              marginBottom: '1.25rem',
              fontSize: '0.825rem',
              color: 'var(--slate-700)'
            }}>
              <strong>Required Headers:</strong> <code>Name</code>, <code>Email</code>, <code>Roll Number</code>, <code>Course</code>.
              <span style={{ color: 'var(--slate-500)', marginLeft: '0.5rem' }}>(Optional: <code>Password</code> — defaults to <code>StudentPassword2026</code> if omitted)</span>
            </div>

            <form onSubmit={handlePreviewImport} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
                  Select CSV or Excel Spreadsheet *
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={(e) => setImportFile(e.target.files[0] || null)}
                  required
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={previewLoading || !importFile}
                  className="btn btn-primary"
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}
                >
                  <RefreshCw size={14} className={previewLoading ? 'spin' : ''} />
                  {previewLoading ? 'Analyzing & Validating...' : 'Preview & Validate File'}
                </button>

                {previewData && (
                  <button
                    type="button"
                    onClick={() => { setPreviewData(null); setImportFile(null); }}
                    className="btn btn-secondary"
                    style={{ padding: '0.65rem 0.95rem', fontSize: '0.85rem' }}
                  >
                    Clear Preview
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Validation Preview Results */}
          {previewData && (
            <div className="section-box" style={{ marginTop: 0 }}>
              <div className="section-header">
                <div className="section-heading">
                  <Database size={20} color="var(--primary-600)" />
                  Validation Results Preview ({previewData.total_rows} Total Rows)
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="badge badge-success">
                    <CheckCircle2 size={12} /> {previewData.valid_count} Valid
                  </span>
                  {previewData.invalid_count > 0 && (
                    <span className="badge badge-error">
                      <XCircle size={12} /> {previewData.invalid_count} Invalid
                    </span>
                  )}
                </div>
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('all')}
                  className={`btn ${previewFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                >
                  All ({previewData.total_rows})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('valid')}
                  className={`btn ${previewFilter === 'valid' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                >
                  Valid Only ({previewData.valid_count})
                </button>
                {previewData.invalid_count > 0 && (
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('invalid')}
                    className={`btn ${previewFilter === 'invalid' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    Errors Only ({previewData.invalid_count})
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="table-wrapper" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Row</th>
                      <th>Student Name</th>
                      <th>Roll Number</th>
                      <th>Course</th>
                      <th>Email</th>
                      <th>Status / Validation Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewFilter === 'invalid'
                      ? previewData.invalid_rows
                      : previewFilter === 'valid'
                        ? previewData.valid_rows
                        : [...previewData.valid_rows, ...previewData.invalid_rows].sort((a, b) => a.row_num - b.row_num)
                    ).map((row, idx) => {
                      const isInvalid = Boolean(row.error_reason);
                      return (
                        <tr key={idx} style={{ background: isInvalid ? '#fff5f5' : 'transparent' }}>
                          <td><code>#{row.row_num}</code></td>
                          <td><strong>{row.name || <em style={{ color: '#dc2626' }}>Missing</em>}</strong></td>
                          <td><code>{row.roll_number || <em style={{ color: '#dc2626' }}>Missing</em>}</code></td>
                          <td><span className="badge badge-secondary">{row.course || 'Missing'}</span></td>
                          <td>{row.email || <em style={{ color: '#dc2626' }}>Missing</em>}</td>
                          <td>
                            {isInvalid ? (
                              <span className="badge badge-error" style={{ fontSize: '0.75rem', whiteSpace: 'normal', maxWidth: '300px', display: 'inline-block' }}>
                                <AlertCircle size={11} style={{ display: 'inline', marginRight: '3px' }} />
                                {row.error_reason}
                              </span>
                            ) : (
                              <span className="badge badge-success">
                                <CheckCircle2 size={12} /> Ready to Import
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Confirmation Callout */}
              <div style={{
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--slate-200)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                  {previewData.valid_count > 0 ? (
                    <>Clicking confirm will securely hash passwords and initialize interest profiles for all <strong>{previewData.valid_count}</strong> valid student accounts.</>
                  ) : (
                    <span style={{ color: '#dc2626' }}>No valid records to import. Please correct the spreadsheet errors and re-upload.</span>
                  )}
                </div>

                {previewData.valid_count > 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={confirmingImport}
                    className="btn btn-primary"
                    style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <UserPlus size={16} />
                    {confirmingImport ? 'Importing Accounts...' : `Confirm & Import ${previewData.valid_count} Student Accounts`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject Submission Feedback Modal */}
      {rejectModalSubmission && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 100,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '1.75rem', position: 'relative' }}>
            <button
              onClick={() => setRejectModalSubmission(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'var(--slate-100)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', marginBottom: '0.75rem' }}>
              <XCircle size={22} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Reject Submission & Provide Feedback</h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '1rem' }}>
              Provide constructive feedback to <strong>{rejectModalSubmission.teacher_name}</strong> for:
              <br />
              <em>"{rejectModalSubmission.title}"</em>.
              This feedback will appear in their dashboard so they can revise and resubmit.
            </p>

            <textarea
              rows={4}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Explain what needs to be changed (e.g. Please add the venue, correct the registration date...)"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--slate-300)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
                marginBottom: '1.25rem',
                resize: 'vertical'
              }}
            />

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setRejectModalSubmission(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading === `sub-${rejectModalSubmission.id}`}
                className="btn btn-primary"
                style={{ background: '#dc2626' }}
              >
                {actionLoading === `sub-${rejectModalSubmission.id}` ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
