import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Server,
  Database,
  Cpu,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Terminal,
  Layers,
  BookOpen,
  Code,
  Shield,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function StatusPage() {
  const [activeTab, setActiveTab] = useState('status');
  const [healthData, setHealthData] = useState(null);
  const [dbData, setDbData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const { isAuthenticated, user } = useAuth();

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    const startTime = performance.now();

    try {
      const [healthRes, dbRes] = await Promise.all([
        api.getHealth(),
        api.getDbTest()
      ]);

      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setLastChecked(new Date().toLocaleTimeString());

      if (!healthRes.success) {
        setError(`Backend Health Error: ${healthRes.error}`);
      } else {
        setHealthData(healthRes.data);
      }

      if (!dbRes.success) {
        setError((prev) => prev ? `${prev} | DB Error: ${dbRes.error}` : `DB Error: ${dbRes.error}`);
      } else {
        setDbData(dbRes.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to execute system diagnostics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="container" style={{ flex: 1 }}>
      {/* Hero Banner */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-pill">
            <Terminal size={14} />
            Phase 3 Core Features & Workflows Complete
          </div>
          <h1 className="hero-title">
            College Student Assistant Platform
          </h1>
          <p className="hero-desc">
            A complete university portal built with React, Flask, SQLite, and Google Gemini File Search.
            Phase 2 establishes student registration, teacher approval governance, secure admin bootstrap, and role-based access control.
          </p>

          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {isAuthenticated ? (
              <Link
                to={user.role === 'student' ? '/student/dashboard' : user.role === 'teacher' ? '/teacher/dashboard' : '/admin/dashboard'}
                className="btn btn-primary"
                style={{ background: 'white', color: 'var(--primary-700)' }}
              >
                Go to My Dashboard ({user.role}) <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary" style={{ background: 'white', color: 'var(--primary-700)' }}>
                  Sign In to CampusAI <ArrowRight size={14} />
                </Link>
                <Link to="/register/student" className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                  Student Registration
                </Link>
                <Link to="/register/teacher" className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                  Teacher Registration
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          <Server size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
          System Connectivity Status
        </button>
        <button
          className={`tab-btn ${activeTab === 'auth' ? 'active' : ''}`}
          onClick={() => setActiveTab('auth')}
        >
          <UserCheck size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
          Phase 2 Auth & RBAC Spec
        </button>
        <button
          className={`tab-btn ${activeTab === 'architecture' ? 'active' : ''}`}
          onClick={() => setActiveTab('architecture')}
        >
          <Layers size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
          Architecture & Design
        </button>
        <button
          className={`tab-btn ${activeTab === 'schema' ? 'active' : ''}`}
          onClick={() => setActiveTab('schema')}
        >
          <Database size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
          Database Schema (8 Tables)
        </button>
        <button
          className={`tab-btn ${activeTab === 'roadmap' ? 'active' : ''}`}
          onClick={() => setActiveTab('roadmap')}
        >
          <BookOpen size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
          Implementation Roadmap
        </button>
      </div>

      {/* TAB 1: System Status */}
      {activeTab === 'status' && (
        <div>
          {error && (
            <div style={{
              background: 'var(--error-bg)',
              border: '1px solid #fecaca',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              color: '#b91c1c',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <AlertCircle size={20} />
              <div>
                <strong>Connectivity Error:</strong> {error}
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Ensure the Flask server is running with <code>python backend/app.py</code> on port 5000.
                </div>
              </div>
            </div>
          )}

          <div className="grid-cards">
            {/* Frontend */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <div className="card-icon blue">
                    <Globe size={18} />
                  </div>
                  <div>
                    <div className="card-title">Frontend</div>
                    <div className="card-subtitle">React 19 + React Router v7</div>
                  </div>
                </div>
                <span className="badge badge-success">
                  <span className="status-dot online"></span>
                  Online
                </span>
              </div>
              <div className="card-value">Port 5173</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                Multi-role AuthContext, protected routes, and role-specific dashboards.
              </p>
            </div>

            {/* Backend */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <div className="card-icon green">
                    <Server size={18} />
                  </div>
                  <div>
                    <div className="card-title">Backend API</div>
                    <div className="card-subtitle">Python Flask 3.x</div>
                  </div>
                </div>
                <span className={`badge ${healthData ? 'badge-success' : 'badge-error'}`}>
                  <span className={`status-dot ${healthData ? 'online' : 'error'}`}></span>
                  {healthData ? 'Connected' : 'Offline'}
                </span>
              </div>
              <div className="card-value">
                {healthData ? 'HTTP 200 OK' : 'No Response'}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                {healthData ? `${healthData.service} v${healthData.version}` : 'Connecting...'}
              </p>
            </div>

            {/* SQLite */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <div className="card-icon purple">
                    <Database size={18} />
                  </div>
                  <div>
                    <div className="card-title">Database</div>
                    <div className="card-subtitle">SQLite (college.db)</div>
                  </div>
                </div>
                <span className={`badge ${dbData?.database_info?.connected ? 'badge-success' : 'badge-error'}`}>
                  <span className={`status-dot ${dbData?.database_info?.connected ? 'online' : 'error'}`}></span>
                  {dbData?.database_info?.connected ? 'Active' : 'Disconnected'}
                </span>
              </div>
              <div className="card-value">
                {dbData ? `${dbData.database_info?.tables_count} Tables` : '0 Tables'}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                Foreign keys enforced with PRAGMA. Password hashing with Werkzeug PBKDF2.
              </p>
            </div>

            {/* Gemini */}
            <div className="card">
              <div className="card-header">
                <div className="card-title-group">
                  <div className="card-icon amber">
                    <Cpu size={18} />
                  </div>
                  <div>
                    <div className="card-title">AI Engine</div>
                    <div className="card-subtitle">Google Gen AI SDK</div>
                  </div>
                </div>
                <span className={`badge ${healthData?.gemini_api?.configured ? 'badge-success' : 'badge-warning'}`}>
                  <span className={`status-dot ${healthData?.gemini_api?.configured ? 'online' : 'warning'}`}></span>
                  {healthData?.gemini_api?.configured ? 'Configured' : 'Setup Required'}
                </span>
              </div>
              <div className="card-value" style={{ fontSize: '1.1rem' }}>
                {healthData?.gemini_api?.configured ? 'Gemini Ready' : 'Key Unconfigured'}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                {healthData?.gemini_api?.configured
                  ? 'Gemini File Search RAG ready for Phase 5.'
                  : 'Add GEMINI_API_KEY in backend/.env for Phase 5.'}
              </p>
            </div>
          </div>

          {/* Diagnostic Details */}
          <div className="section-box">
            <div className="section-header">
              <div className="section-heading">
                <CheckCircle2 size={20} color="var(--success)" />
                Live Diagnostics Payload
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {latency !== null && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                    Roundtrip latency: <strong>{latency} ms</strong>
                  </span>
                )}
                <button
                  onClick={runDiagnostics}
                  disabled={loading}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  <RefreshCw size={12} className={loading ? 'spin' : ''} /> Test
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--slate-700)' }}>
                  GET /api/health
                </div>
                <pre className="code-box">
                  {JSON.stringify(healthData || { status: 'loading...' }, null, 2)}
                </pre>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--slate-700)' }}>
                  GET /api/db-test
                </div>
                <pre className="code-box">
                  {JSON.stringify(dbData || { status: 'loading...' }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Phase 2 Auth & RBAC Spec */}
      {activeTab === 'auth' && (
        <div className="section-box">
          <div className="section-header">
            <div className="section-heading">
              <Shield size={20} color="var(--primary-600)" />
              Phase 2: Authentication & Role-Based Governance Model
            </div>
            <span className="badge badge-success">Implemented & Verified</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', padding: '1.25rem', background: '#eff6ff' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e40af', marginBottom: '0.5rem' }}>
                🎓 Student Role Workflow
              </h3>
              <ul style={{ fontSize: '0.85rem', color: 'var(--slate-700)', paddingLeft: '1.2rem', lineHeight: 1.7 }}>
                <li>Public registration with name, email, roll number, course selection</li>
                <li>Interest tag onboarding (AI/ML, Coding, Robotics, etc.)</li>
                <li>Instant login & token generation on successful registration</li>
                <li>Default notification preferences populated in <code>student_preferences</code></li>
              </ul>
            </div>

            <div style={{ border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', padding: '1.25rem', background: '#fffbeb' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#92400e', marginBottom: '0.5rem' }}>
                💼 Teacher Governance Workflow
              </h3>
              <ul style={{ fontSize: '0.85rem', color: 'var(--slate-700)', paddingLeft: '1.2rem', lineHeight: 1.7 }}>
                <li>Public registration requires official department & email</li>
                <li><strong>Strict Approval Gate:</strong> Created with <code>approval_status = 'pending'</code></li>
                <li>Login is <strong>blocked with HTTP 403</strong> while pending or rejected</li>
                <li>Only administrators can approve teacher accounts</li>
              </ul>
            </div>

            <div style={{ border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', padding: '1.25rem', background: '#f5f3ff' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#5b21b6', marginBottom: '0.5rem' }}>
                🛡️ Administrator Security Workflow
              </h3>
              <ul style={{ fontSize: '0.85rem', color: 'var(--slate-700)', paddingLeft: '1.2rem', lineHeight: 1.7 }}>
                <li><strong>No public signup:</strong> Initial admin is bootstrapped with <code>ADMIN_SETUP_KEY</code></li>
                <li>Locked out automatically once the first administrator account is created</li>
                <li>Full review power: can approve or reject teacher registrations</li>
                <li>View platform statistics & aggregate counts</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Architecture */}
      {activeTab === 'architecture' && (
        <div className="section-box">
          <div className="section-header">
            <div className="section-heading">
              <Layers size={20} color="var(--primary-600)" />
              Decoupled Architecture
            </div>
          </div>
          <p style={{ color: 'var(--slate-600)', lineHeight: 1.6, fontSize: '0.9rem' }}>
            The application enforces strict separation between presentation (React 19), application/security logic (Flask REST API), persistence (SQLite 3), and knowledge retrieval (Google Gemini File Search RAG). All sensitive credentials and passwords are encrypted and never exposed to the client.
          </p>
        </div>
      )}

      {/* TAB 4: Database Schema */}
      {activeTab === 'schema' && (
        <div className="section-box">
          <div className="section-header">
            <div className="section-heading">
              <Database size={20} color="var(--primary-600)" />
              SQLite Database Schema (8 Tables)
            </div>
          </div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Table</th>
                  <th>Primary Key & Columns</th>
                  <th>Constraints & Relationships</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>students</code></td>
                  <td><code>id (PK)</code>, <code>name</code>, <code>email</code>, <code>roll_number</code>, <code>course</code>, <code>password_hash</code></td>
                  <td><code>email UNIQUE</code>, <code>roll_number UNIQUE</code></td>
                </tr>
                <tr>
                  <td><code>teachers</code></td>
                  <td><code>id (PK)</code>, <code>name</code>, <code>email</code>, <code>department</code>, <code>password_hash</code>, <code>approval_status</code></td>
                  <td><code>email UNIQUE</code>, <code>approval_status IN ('pending', 'approved', 'rejected')</code></td>
                </tr>
                <tr>
                  <td><code>admins</code></td>
                  <td><code>id (PK)</code>, <code>name</code>, <code>email</code>, <code>password_hash</code></td>
                  <td><code>email UNIQUE</code>, Initial bootstrap token required</td>
                </tr>
                <tr>
                  <td><code>announcements</code></td>
                  <td><code>id (PK)</code>, <code>title</code>, <code>description</code>, <code>category</code>, <code>course</code>, <code>status</code></td>
                  <td>Target course filtering & notification trigger</td>
                </tr>
                <tr>
                  <td><code>teacher_submissions</code></td>
                  <td><code>id (PK)</code>, <code>teacher_id</code>, <code>title</code>, <code>document_path</code>, <code>submission_status</code></td>
                  <td><code>FK → teachers(id) ON DELETE CASCADE</code></td>
                </tr>
                <tr>
                  <td><code>documents</code></td>
                  <td><code>id (PK)</code>, <code>title</code>, <code>stored_path</code>, <code>approval_status</code>, <code>indexing_status</code></td>
                  <td>Dual-state: Admin approval separated from Gemini indexing</td>
                </tr>
                <tr>
                  <td><code>notifications</code></td>
                  <td><code>id (PK)</code>, <code>student_id</code>, <code>announcement_id</code>, <code>title</code>, <code>is_read</code></td>
                  <td><code>FK → students(id) ON DELETE CASCADE</code></td>
                </tr>
                <tr>
                  <td><code>student_preferences</code></td>
                  <td><code>id (PK)</code>, <code>student_id</code>, <code>interests (JSON)</code>, <code>event_notifications_enabled</code></td>
                  <td><code>FK → students(id) ON DELETE CASCADE, UNIQUE</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Roadmap */}
      {activeTab === 'roadmap' && (
        <div className="section-box">
          <div className="section-header">
            <div className="section-heading">
              <BookOpen size={20} color="var(--primary-600)" />
              Implementation Roadmap
            </div>
            <span className="badge badge-success">Phase 3 Complete</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <RoadmapItem
              number={1}
              title="Phase 1 — Foundation"
              status="completed"
              desc="Scaffold, Flask backend, React frontend, SQLite schema, Vite proxy, verification tests."
            />
            <RoadmapItem
              number={2}
              title="Phase 2 — Authentication & Role-Based Access Control"
              status="completed"
              desc="Student registration & login, Teacher registration with admin approval requirement, Admin secure bootstrap login, RBAC decorators & protected frontend routes."
            />
            <RoadmapItem
              number={3}
              title="Phase 3 — Core Workflows & Dashboards"
              status="completed"
              desc="Student events feed with course/category filtering, Teacher announcement & PDF submission with approval tracker, Administrator direct PDF upload, Admin review with constructive feedback."
            />
            <RoadmapItem
              number={4}
              title="Phase 4 — Announcements & Smart Notifications"
              status="active"
              desc="Student interest & notification preference toggles, intelligent notification fanout on announcement approval, unread counts, mark-as-read."
            />
            <RoadmapItem
              number={5}
              title="Phase 5 — Gemini File Search & College Chatbot"
              status="upcoming"
              desc="Gemini File Search API store management, indexing of approved PDFs, chatbot query endpoint with source references, graceful fallback when facts are missing."
            />
            <RoadmapItem
              number={6}
              title="Phase 6 — Data Import, Demo Datasets & Verification"
              status="upcoming"
              desc="Pandas CSV/Excel student import with preview and validation, dummy_students.csv, dummy_teachers.csv, end-to-end testing across all 3 roles."
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RoadmapItem({ number, title, status, desc }) {
  const isDone = status === 'completed';
  const isActive = status === 'active';
  return (
    <div style={{
      border: `1px solid ${isActive ? 'var(--primary-500)' : isDone ? '#bbf7d0' : 'var(--slate-200)'}`,
      background: isActive ? '#eef2ff' : isDone ? '#f0fdf4' : 'white',
      borderRadius: 'var(--radius-md)',
      padding: '1rem 1.25rem',
      display: 'flex',
      gap: '1rem',
      alignItems: 'center'
    }}>
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: isActive ? 'var(--primary-600)' : isDone ? 'var(--success)' : 'var(--slate-200)',
        color: isActive || isDone ? 'white' : 'var(--slate-600)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '0.8rem',
        flexShrink: 0
      }}>
        {isDone ? <CheckCircle2 size={16} /> : number}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: '0.9rem' }}>{title}</div>
          <span className={`badge ${isActive ? 'badge-info' : isDone ? 'badge-success' : 'badge-warning'}`}>
            {isActive ? 'Active Phase' : isDone ? 'Completed' : 'Upcoming'}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginTop: '0.2rem' }}>{desc}</div>
      </div>
    </div>
  );
}
