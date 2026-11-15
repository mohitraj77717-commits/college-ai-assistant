import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import StatusPage from './pages/StatusPage';
import Login from './pages/Login';
import RegisterStudent from './pages/RegisterStudent';
import RegisterTeacher from './pages/RegisterTeacher';
import AdminSetup from './pages/AdminSetup';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import TeacherDashboard from './pages/dashboards/TeacherDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';

export default function App() {
  return (
    <AuthProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            {/* System Status & Architectural Hub */}
            <Route path="/" element={<StatusPage />} />

            {/* Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register/student" element={<RegisterStudent />} />
            <Route path="/register/teacher" element={<RegisterTeacher />} />
            <Route path="/admin-setup" element={<AdminSetup />} />

            {/* Protected Role-Based Dashboards */}
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/dashboard"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer style={{ background: 'white', borderTop: '1px solid var(--slate-200)', padding: '1rem', marginTop: 'auto' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--slate-500)', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              CampusAI &bull; Built with <strong>React 19</strong>, <strong>Flask</strong>, <strong>SQLite</strong>, and <strong>Google Gen AI SDK</strong>
            </div>
            <div>
              University Hackathon 2026 &bull; Phase 2 Authentication Active
            </div>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}
