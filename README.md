# CampusAI — AI-Powered College Student Assistant

[![Hackathon Project](https://img.shields.io/badge/University%20Hackathon-2026-indigo.svg)](https://github.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-blue.svg)](https://react.dev/)
[![Flask](https://img.shields.io/badge/Backend-Python%20Flask%203.x-green.svg)](https://flask.palletsprojects.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%203-lightgrey.svg)](https://www.sqlite.org/)
[![Google Gen AI](https://img.shields.io/badge/AI-Google%20Gen%20AI%20SDK-orange.svg)](https://github.com/google-gemini/google-genai)

A modern, responsive, full-stack college assistant platform designed for a university hackathon. Built from the ground up to empower students with personalized event discovery and an AI-powered college knowledge chatbot, while equipping teachers and administrators with secure document review, approval, and announcement publishing workflows.

---

## 🏛️ System Architecture

The application adopts a decoupled three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                   PRESENTATION TIER (React)                 │
│  - React 19 Single Page Application (SPA) with React Router │
│  - Responsive, accessible dashboard UI (Student / Teacher / Admin) │
│  - Live communication via unified API client (`services/api.js`) │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON REST APIs
┌──────────────────────────────▼──────────────────────────────┐
│                    APPLICATION TIER (Flask)                 │
│  - Python 3.14 Flask REST API with modular Blueprints       │
│  - Role-Based Access Control (RBAC) & Secure Password Hash  │
│  - Pandas Service for CSV / Excel student roster imports    │
│  - Notification Engine with course & interest filtering     │
│  - Isolated Gemini File Search Service                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│       DATA PERSISTENCE       │    │      KNOWLEDGE RETRIEVAL     │
│   SQLite Database (college.db)│    │ Google Gemini File Search RAG│
│   - Relational foreign keys  │    │ - Official Google Gen AI SDK │
│   - 8 normalized tables      │    │ - Managed document store     │
│   - Parameterized queries    │    │ - Approved PDFs ONLY         │
└──────────────────────────────┘    └──────────────────────────────┘
```

---

## 🗄️ Database Design (`college.db`)

The database consists of 8 normalized tables with foreign keys and performance indexes:

| Table | Purpose | Key Columns & Constraints |
| :--- | :--- | :--- |
| `students` | Student profiles and credentials | `id` (PK), `name`, `email` (UNIQUE), `roll_number` (UNIQUE), `course`, `password_hash`, `created_at` |
| `teachers` | Teacher accounts requiring admin approval | `id` (PK), `name`, `email` (UNIQUE), `department`, `password_hash`, `approval_status` (pending/approved/rejected) |
| `admins` | System administrators | `id` (PK), `name`, `email` (UNIQUE), `password_hash`, `created_at` |
| `announcements` | Approved events and announcements | `id` (PK), `title`, `description`, `category`, `event_date`, `deadline`, `registration_link`, `course`, `status` |
| `teacher_submissions` | Teacher announcements pending admin review | `id` (PK), `teacher_id` (FK → teachers.id ON DELETE CASCADE), `title`, `description`, `document_path`, `submission_status`, `admin_feedback` |
| `documents` | Official college PDFs | `id` (PK), `title`, `stored_path`, `uploaded_by`, `uploader_role`, `approval_status`, `indexing_status`, `gemini_store_reference` |
| `notifications` | Student notifications with read tracking | `id` (PK), `student_id` (FK → students.id ON DELETE CASCADE), `announcement_id` (FK → announcements.id), `title`, `message`, `is_read` |
| `student_preferences` | Notification toggles and interests | `id` (PK), `student_id` (FK → students.id ON DELETE CASCADE, UNIQUE), `interests` (JSON), `event_notifications_enabled`, `academic_notifications_enabled` |

### Key Relational Rule: Enforced Foreign Keys
By default, SQLite disables foreign key constraints. CampusAI explicitly enables them on every connection:
```sql
PRAGMA foreign_keys = ON;
```

---

## 📑 Dual-State Document Lifecycle

To guarantee students never receive hallucinated or unverified information, uploaded documents follow two strictly independent states:

1. **`approval_status`**: `pending` ➔ `approved` or `rejected` (controlled by Admin).
2. **`indexing_status`**: `not_indexed` ➔ `indexing` ➔ `indexed` or `failed` (controlled by Gemini Service).

```
[Teacher Submits Notice] ──► [Admin Review Dashboard]
                                    │
                                    ├─── Rejected ──► [Teacher receives feedback, NOT indexed]
                                    │
                                    └─── Approved ──► [backend/uploads/ stored]
                                                            │
                                                            └──► [Gemini File Search Indexing]
                                                                        │
                                                                        ├── Success ──► Chatbot-Ready!
                                                                        └── Failed  ──► Error flagged, not queried
```

---

## 🛣️ Implementation Phases

- **Phase 1 — Foundation (Completed)**: Project scaffold, Flask backend, React frontend, SQLite schema, test endpoints, Vite proxy.
- **Phase 2 — Authentication**: Student registration/login, Teacher registration with Admin approval gate, Admin bootstrap login, RBAC session decorators.
- **Phase 3 — Core Features**: Dashboards for all 3 roles, teacher submission workflow, admin approval/rejection with feedback, admin direct PDF uploads.
- **Phase 4 — Notifications**: Student interest selection, event/academic toggles, intelligent notification distribution, unread badge counters.
- **Phase 5 — Gemini Integration**: Official Google Gen AI SDK integration, File Search document store management, student chatbot query endpoint with citations.
- **Phase 6 — Data Import & Verification**: Pandas CSV/Excel student roster batch importer, fictional demo datasets (`dummy_students.csv`, `dummy_teachers.csv`), end-to-end testing.

---

## 🚀 Local Setup Instructions

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ and npm (tested on Node v24)

### 1. Clone the Repository
```bash
git clone <repo-url>
cd college-ai-assistant
```

### 2. Backend Setup
1. Open a terminal in the root directory:
```bash
# Navigate to backend folder
cd backend

# Install Python dependencies
pip install -r requirements.txt
```

2. Configure environment variables:
```bash
# Copy the example environment file
cp .env.example .env
```
Open `backend/.env` in any text editor and:
- Set your `GEMINI_API_KEY` obtained from [Google AI Studio](https://aistudio.google.com/).
- Change `SECRET_KEY` and `ADMIN_SETUP_KEY` as desired.

3. Initialize the SQLite database:
```bash
python database.py
```
*(You will see a confirmation verifying that all 8 tables were initialized in `college.db`)*

4. Start the Flask server:
```bash
python app.py
```
*(The backend will start on `http://127.0.0.1:5000`)*

### 3. Frontend Setup
1. In a new terminal window:
```bash
# Navigate to frontend folder
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```
2. Open your browser and visit: `http://localhost:5173`

---

## 🔒 Security Principles
- **No Hardcoded Secrets**: Secrets and API keys are loaded via `python-dotenv` from `backend/.env` (excluded by `.gitignore`).
- **Never Expose Gemini API Key**: The frontend never receives or handles the Gemini API key; all AI interactions proxy through Flask.
- **Password Protection**: Passwords are securely hashed with Werkzeug `generate_password_hash` using salted PBKDF2 with SHA-256.
- **SQL Injection Prevention**: Every SQL statement utilizes parameterized bindings (`?`).
- **Safe File Storage**: Uploaded PDFs are restricted by extension and MIME type, given sanitized UUID storage paths, and placed outside public web directories.
