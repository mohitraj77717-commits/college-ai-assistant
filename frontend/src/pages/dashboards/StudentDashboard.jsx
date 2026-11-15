import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  GraduationCap,
  Sparkles,
  Calendar,
  Clock,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  FileText,
  User,
  Tag,
  X,
  Bell,
  Sliders,
  CheckCircle2,
  BookOpen
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'ai-ml', label: 'AI/ML' },
  { id: 'coding', label: 'Coding' },
  { id: 'robotics', label: 'Robotics' },
  { id: 'cultural', label: 'Cultural' },
  { id: 'academic', label: 'Academic' },
  { id: 'general', label: 'General' },
];

const AVAILABLE_INTERESTS = [
  'AI/ML',
  'Coding',
  'Robotics',
  'Cultural Events',
  'Technical Competitions',
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all'); // 'all' or 'my_course'
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // Preference Settings Modal State
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);
  const [userInterests, setUserInterests] = useState(user?.interests || ['AI/ML', 'Coding']);
  const [eventNotifsEnabled, setEventNotifsEnabled] = useState(true);
  const [academicNotifsEnabled, setAcademicNotifsEnabled] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (courseFilter === 'my_course' && user?.course) params.course = user.course;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getAnnouncements(params);
      if (res.success) {
        setAnnouncements(res.data?.announcements || []);
      } else {
        setError(res.error || 'Failed to load announcements.');
      }
    } catch (err) {
      setError(err.message || 'Error fetching announcements.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentPreferences = async () => {
    try {
      const res = await api.getStudentPreferences();
      if (res.success && res.data?.preferences) {
        const p = res.data.preferences;
        setUserInterests(p.interests || []);
        setEventNotifsEnabled(p.event_notifications_enabled);
        setAcademicNotifsEnabled(p.academic_notifications_enabled);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchStudentPreferences();
  }, [selectedCategory, courseFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAnnouncements();
  };

  const toggleInterest = (interest) => {
    if (userInterests.includes(interest)) {
      setUserInterests(userInterests.filter((i) => i !== interest));
    } else {
      setUserInterests([...userInterests, interest]);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    setPrefSuccess(false);

    try {
      const res = await api.updateStudentPreferences({
        interests: userInterests,
        event_notifications_enabled: eventNotifsEnabled,
        academic_notifications_enabled: academicNotifsEnabled,
      });

      if (res.success) {
        setPrefSuccess(true);
        setTimeout(() => {
          setIsPrefModalOpen(false);
          setPrefSuccess(false);
        }, 1200);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPrefs(false);
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'ai-ml':
        return { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' };
      case 'coding':
        return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' };
      case 'robotics':
        return { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' };
      case 'cultural':
        return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' };
      case 'academic':
        return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
      default:
        return { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };
    }
  };

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
            <GraduationCap size={14} /> Student Portal & Events Feed
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Welcome back, {user?.name}!
          </h1>
          <p style={{ color: '#c7d2fe', fontSize: '0.95rem' }}>
            Enrolled in <strong>{user?.course || 'Engineering'}</strong> &bull; Roll: <code>{user?.roll_number}</code>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.65rem 1.15rem', borderRadius: 'var(--radius-md)', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: '0.7rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              My Interests
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              {userInterests && userInterests.length > 0 ? (
                userInterests.map((t) => (
                  <span key={t} style={{ background: 'rgba(255,255,255,0.2)', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600 }}>
                    {t}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>General</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPrefModalOpen(true)}
            className="btn btn-secondary"
            style={{
              padding: '0.65rem 0.95rem',
              fontSize: '0.8rem',
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <Sliders size={14} /> Notification Settings
          </button>
        </div>
      </div>

      {/* Announcements Controls / Filter Bar */}
      <div className="section-box" style={{ marginTop: 0, marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '260px', maxWidth: '480px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} color="var(--slate-400)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search events, workshops, notices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                  border: '1px solid var(--slate-300)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
            <button type="submit" className="btn btn-secondary" style={{ padding: '0.55rem 0.9rem', fontSize: '0.85rem' }}>
              Search
            </button>
          </form>

          {/* Course Scope Selector & Refresh */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'var(--slate-100)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
              <button
                type="button"
                onClick={() => setCourseFilter('all')}
                style={{
                  padding: '0.4rem 0.75rem',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: courseFilter === 'all' ? 'white' : 'transparent',
                  color: courseFilter === 'all' ? 'var(--primary-700)' : 'var(--slate-600)',
                  boxShadow: courseFilter === 'all' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                All Campus Events
              </button>
              <button
                type="button"
                onClick={() => setCourseFilter('my_course')}
                style={{
                  padding: '0.4rem 0.75rem',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: courseFilter === 'my_course' ? 'white' : 'transparent',
                  color: courseFilter === 'my_course' ? 'var(--primary-700)' : 'var(--slate-600)',
                  boxShadow: courseFilter === 'my_course' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                For My Course Only
              </button>
            </div>

            <button
              onClick={fetchAnnouncements}
              disabled={loading}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              title="Refresh announcements feed"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${isSelected ? 'var(--primary-600)' : 'var(--slate-200)'}`,
                  background: isSelected ? 'var(--primary-600)' : 'white',
                  color: isSelected ? 'white' : 'var(--slate-700)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
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

      {/* Announcements Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--slate-500)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.75rem' }} />
          <div>Loading official announcements...</div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <Calendar size={36} color="var(--slate-400)" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.25rem' }}>
            No Announcements Found
          </h3>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
            There are no published announcements matching your current filters. Faculty and administrators will publish upcoming events soon.
          </p>
          {(selectedCategory !== 'all' || courseFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => { setSelectedCategory('all'); setCourseFilter('all'); setSearchQuery(''); }}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {announcements.map((item) => {
            const catStyle = getCategoryColor(item.category);
            return (
              <div
                key={item.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedAnnouncement(item)}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' }}>
                    <span
                      style={{
                        background: catStyle.bg,
                        color: catStyle.text,
                        border: `1px solid ${catStyle.border}`,
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {item.category}
                    </span>

                    <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                      {item.course === 'All' ? 'All Courses' : item.course}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                    {item.title}
                  </h3>

                  <p style={{
                    color: 'var(--slate-600)',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    marginBottom: '1rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {item.description}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '0.85rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--slate-500)', marginBottom: '0.75rem' }}>
                    {item.event_date ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} color="var(--primary-600)" />
                        Event: <strong>{item.event_date}</strong>
                      </span>
                    ) : (
                      <span>Circular Notice</span>
                    )}

                    {item.deadline && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b45309' }}>
                        <Clock size={13} />
                        Deadline: <strong>{item.deadline}</strong>
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {item.registration_link && (
                      <a
                        href={item.registration_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', flex: 1 }}
                      >
                        Register Now <ExternalLink size={12} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedAnnouncement(item)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', flex: item.registration_link ? 0 : 1 }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
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
          <div className="card" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', position: 'relative' }}>
            <button
              onClick={() => setSelectedAnnouncement(null)}
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

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
              <span className="badge badge-info" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                {selectedAnnouncement.category}
              </span>
              <span className="badge badge-secondary">
                Target: {selectedAnnouncement.course}
              </span>
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '0.75rem', lineHeight: 1.3 }}>
              {selectedAnnouncement.title}
            </h2>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '0.75rem 1rem', background: 'var(--slate-50)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              {selectedAnnouncement.event_date && (
                <div>
                  <span style={{ color: 'var(--slate-500)' }}>Event Date: </span>
                  <strong>{selectedAnnouncement.event_date}</strong>
                </div>
              )}
              {selectedAnnouncement.deadline && (
                <div>
                  <span style={{ color: '#b45309' }}>Registration Deadline: </span>
                  <strong style={{ color: '#b45309' }}>{selectedAnnouncement.deadline}</strong>
                </div>
              )}
              <div>
                <span style={{ color: 'var(--slate-500)' }}>Posted by: </span>
                <strong style={{ textTransform: 'capitalize' }}>{selectedAnnouncement.created_by_role}</strong>
              </div>
            </div>

            <div style={{ fontSize: '0.9rem', color: 'var(--slate-700)', lineHeight: 1.7, marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
              {selectedAnnouncement.description}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--slate-100)', paddingTop: '1rem' }}>
              {selectedAnnouncement.registration_link && (
                <a
                  href={selectedAnnouncement.registration_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                >
                  Open Official Registration Link <ExternalLink size={14} />
                </a>
              )}
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Preferences & Interests Modal */}
      {isPrefModalOpen && (
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
              onClick={() => setIsPrefModalOpen(false)}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--primary-50)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sliders size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  Notification & Interest Settings
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                  Customize which notifications you receive and what topics interest you
                </p>
              </div>
            </div>

            {prefSuccess && (
              <div style={{ background: 'var(--success-bg)', border: '1px solid #bbf7d0', color: '#166534', padding: '0.65rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} />
                Preferences updated successfully!
              </div>
            )}

            <form onSubmit={handleSavePreferences} style={{ marginTop: '1rem' }}>
              {/* Delivery Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem', background: 'var(--slate-50)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--slate-800)', marginBottom: '0.25rem' }}>
                  Notification Delivery Channels:
                </div>

                {/* Event Toggle */}
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} color="var(--primary-600)" />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>Campus Events & Competitions</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Hackathons, cultural fests, workshops, coding sprints</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={eventNotifsEnabled}
                    onChange={(e) => setEventNotifsEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </label>

                {/* Academic Toggle */}
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '0.85rem', borderTop: '1px solid var(--slate-200)', paddingTop: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BookOpen size={16} color="#b45309" />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>Academic & Exam Circulars</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Datesheets, syllabus updates, official administrative notices</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={academicNotifsEnabled}
                    onChange={(e) => setAcademicNotifsEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </label>
              </div>

              {/* Interests Tags Manager */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--slate-800)', marginBottom: '0.5rem' }}>
                  <Sparkles size={15} color="var(--primary-600)" />
                  Campus Topics of Interest:
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginBottom: '0.75rem' }}>
                  Click to add or remove tags. The notification engine uses these to send you relevant opportunities.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                  {AVAILABLE_INTERESTS.map((interest) => {
                    const isSelected = userInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: 'var(--radius-full)',
                          border: `1px solid ${isSelected ? 'var(--primary-600)' : 'var(--slate-300)'}`,
                          background: isSelected ? 'var(--primary-50)' : 'white',
                          color: isSelected ? 'var(--primary-700)' : 'var(--slate-700)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected && <CheckCircle2 size={13} color="var(--primary-600)" />}
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--slate-100)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsPrefModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPrefs}
                  className="btn btn-primary"
                >
                  {savingPrefs ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
