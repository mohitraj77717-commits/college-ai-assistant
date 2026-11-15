/**
 * Universal API Service for College AI Assistant
 * Interacts with the Flask backend. Automatically attaches Bearer tokens.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

// Token storage key
const TOKEN_KEY = 'campusai_auth_token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/**
 * Universal fetch wrapper with JSON handling and token injection.
 * Supports FormData for multipart file uploads.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = tokenStorage.get();

  const isFormData = options.body instanceof FormData;
  const headers = { ...options.headers };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: (data && data.message) || (data && data.error) || response.statusText,
        errorType: data && data.error,
        data: null,
      };
    }

    return {
      success: true,
      status: response.status,
      data,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      status: 0,
      error: err.message || 'Network error: could not connect to Flask backend',
      data: null,
    };
  }
}

export const api = {
  // --- System ---
  getHealth: () => request('/api/health'),
  getDbTest: () => request('/api/db-test'),

  // --- Student Auth ---
  registerStudent: (payload) =>
    request('/api/auth/student/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  loginStudent: (payload) =>
    request('/api/auth/student/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // --- Teacher Auth ---
  registerTeacher: (payload) =>
    request('/api/auth/teacher/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  loginTeacher: (payload) =>
    request('/api/auth/teacher/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // --- Admin Auth & Bootstrap ---
  getAdminStatus: () => request('/api/auth/admin/status'),

  setupAdmin: (payload) =>
    request('/api/auth/admin/setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  loginAdmin: (payload) =>
    request('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // --- Profile & Session ---
  getMe: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  // --- Admin Teacher Approval Endpoints (Phase 2) ---
  getPendingTeachers: () => request('/api/admin/teachers/pending'),
  getAllTeachers: (status) => request(status ? `/api/admin/teachers?status=${status}` : '/api/admin/teachers'),
  approveTeacher: (teacherId) =>
    request(`/api/admin/teachers/${teacherId}/approve`, { method: 'POST' }),
  rejectTeacher: (teacherId) =>
    request(`/api/admin/teachers/${teacherId}/reject`, { method: 'POST' }),
  getAdminStats: () => request('/api/admin/stats'),

  // --- Phase 3: Announcements, Submissions & Documents ---
  getAnnouncements: (params = {}) => {
    const query = new URLSearchParams();
    if (params.course) query.append('course', params.course);
    if (params.category) query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString();
    return request(qs ? `/api/announcements?${qs}` : '/api/announcements');
  },

  getAnnouncement: (id) => request(`/api/announcements/${id}`),

  submitTeacherAnnouncement: (formData) =>
    request('/api/teacher/submit', {
      method: 'POST',
      body: formData,
    }),

  getTeacherSubmissions: () => request('/api/teacher/my-submissions'),

  adminUploadDocument: (formData) =>
    request('/api/documents/admin-upload', {
      method: 'POST',
      body: formData,
    }),

  getDocuments: () => request('/api/documents'),
  approveDocument: (docId) => request(`/api/documents/${docId}/approve`, { method: 'POST' }),
  rejectDocument: (docId) => request(`/api/documents/${docId}/reject`, { method: 'POST' }),

  getTeacherSubmissionsAdmin: (status = 'pending') =>
    request(`/api/admin/submissions?status=${status}`),

  reviewTeacherSubmission: (submissionId, reviewPayload) =>
    request(`/api/admin/submissions/${submissionId}/review`, {
      method: 'POST',
      body: JSON.stringify(reviewPayload),
    }),

  adminCreateAnnouncement: (payload) =>
    request('/api/admin/announcements/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // =================================================================
  // Phase 4: Notifications & Student Preferences
  // =================================================================

  getNotifications: () => request('/api/notifications'),
  getUnreadNotificationCount: () => request('/api/notifications/unread-count'),
  markNotificationRead: (id) =>
    request(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () =>
    request('/api/notifications/mark-all-read', { method: 'PUT' }),
  dismissNotification: (id) =>
    request(`/api/notifications/${id}`, { method: 'DELETE' }),

  getStudentPreferences: () => request('/api/student/preferences'),
  updateStudentPreferences: (payload) =>
    request('/api/student/preferences', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

export default api;
