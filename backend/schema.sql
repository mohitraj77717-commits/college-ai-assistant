-- ====================================================================
-- College AI Assistant Database Schema (college.db)
-- Designed for SQLite with foreign key enforcement and indexes.
-- ====================================================================

PRAGMA foreign_keys = ON;

-- 1. Students Table
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    roll_number TEXT UNIQUE NOT NULL,
    course TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Teachers Table (Requires admin approval before login)
CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Administrators Table (Created via secure bootstrap process)
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Published Announcements (Visible to eligible students)
CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g. 'coding', 'ai-ml', 'robotics', 'cultural', 'academic', 'general'
    event_date TEXT,
    deadline TEXT,
    registration_link TEXT,
    course TEXT DEFAULT 'All', -- Target course or 'All'
    created_by_role TEXT NOT NULL DEFAULT 'admin',
    created_by_id INTEGER,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Teacher Submissions (Require admin review before publishing)
CREATE TABLE IF NOT EXISTS teacher_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    event_date TEXT,
    deadline TEXT,
    registration_link TEXT,
    course TEXT DEFAULT 'All',
    document_path TEXT,
    submission_status TEXT NOT NULL DEFAULT 'pending' CHECK (submission_status IN ('pending', 'approved', 'rejected')),
    admin_feedback TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP
);

-- 6. Uploaded Documents (Separate approval & Gemini indexing lifecycle)
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    uploaded_by INTEGER NOT NULL,
    uploader_role TEXT NOT NULL CHECK (uploader_role IN ('admin', 'teacher')),
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    indexing_status TEXT NOT NULL DEFAULT 'not_indexed' CHECK (indexing_status IN ('not_indexed', 'indexing', 'indexed', 'failed')),
    gemini_store_reference TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Student Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    announcement_id INTEGER REFERENCES announcements(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL DEFAULT 'event' CHECK (notification_type IN ('event', 'academic', 'general')),
    is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Student Preferences (Interests and notification toggles)
CREATE TABLE IF NOT EXISTS student_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    interests TEXT DEFAULT '[]', -- JSON array of selected interest tags
    event_notifications_enabled INTEGER NOT NULL DEFAULT 1 CHECK (event_notifications_enabled IN (0, 1)),
    academic_notifications_enabled INTEGER NOT NULL DEFAULT 1 CHECK (academic_notifications_enabled IN (0, 1)),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Performance & Search Indexes
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_number);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_teachers_approval ON teachers(approval_status);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_announcements_category ON announcements(category);
CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_teacher_submissions_status ON teacher_submissions(submission_status);
CREATE INDEX IF NOT EXISTS idx_teacher_submissions_teacher ON teacher_submissions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_documents_approval_indexing ON documents(approval_status, indexing_status);
CREATE INDEX IF NOT EXISTS idx_notifications_student_read ON notifications(student_id, is_read);
CREATE INDEX IF NOT EXISTS idx_student_prefs_student ON student_preferences(student_id);
