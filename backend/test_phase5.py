"""
Automated Verification Suite for Phase 5 (Gemini File Search & College Chatbot)
Tests:
1. Chatbot status endpoint (/api/chatbot/status)
2. Safe standby mode handling when GEMINI_API_KEY is not configured
3. Empty prompt validation
4. Document indexing validation (blocks unapproved documents)
5. Decoupled document lifecycle (approval vs indexing)
6. Grounded response structure with sources

Runs in isolation using test_phase5.db.
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Configure test database before importing app
TEST_DB = backend_dir / "test_phase5.db"
os.environ["DATABASE_NAME"] = "test_phase5.db"

from app import create_app
from database import init_db, get_db, execute_db, query_db
from config import Config
from auth import generate_token, hash_password


class Phase5TestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Clean up any lingering test database
        if TEST_DB.exists():
            try:
                TEST_DB.unlink()
            except Exception:
                pass

        Config.DATABASE_NAME = "test_phase5.db"
        Config.DATABASE_PATH = str(TEST_DB)

        cls.app = create_app()
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            init_db()
            # Seed test student
            cls.student_id = execute_db(
                "INSERT INTO students (name, email, roll_number, course, password_hash) VALUES (?, ?, ?, ?, ?)",
                ("Test Student", "student@test.edu", "CS-501", "B.Tech CSE", hash_password("pass123"))
            )
            cls.student_token = generate_token(cls.student_id, "student", "student@test.edu")

            # Seed test admin
            cls.admin_id = execute_db(
                "INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)",
                ("Test Admin", "admin@test.edu", hash_password("adminpass123"))
            )
            cls.admin_token = generate_token(cls.admin_id, "admin", "admin@test.edu")

    @classmethod
    def tearDownClass(cls):
        if TEST_DB.exists():
            try:
                TEST_DB.unlink()
            except Exception:
                pass

    def test_01_chatbot_status_unauthenticated(self):
        """Unauthenticated requests to chatbot endpoints should be blocked with 401."""
        res = self.client.get('/api/chatbot/status')
        self.assertEqual(res.status_code, 401)

    def test_02_chatbot_status_authenticated(self):
        """Authenticated student should get valid chatbot status information."""
        res = self.client.get(
            '/api/chatbot/status',
            headers={'Authorization': f'Bearer {self.student_token}'}
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn('gemini_configured', data)
        self.assertIn('approved_documents_count', data)
        self.assertIn('indexed_documents_count', data)
        self.assertIn('ready', data)
        print("  ✓ test_02: Chatbot status endpoint returned operational data")

    def test_03_ask_chatbot_empty_query(self):
        """Empty query should be rejected with 400 Bad Request."""
        res = self.client.post(
            '/api/chatbot/ask',
            headers={'Authorization': f'Bearer {self.student_token}'},
            json={'message': '   '}
        )
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'error')
        print("  ✓ test_03: Empty queries properly rejected")

    def test_04_ask_chatbot_standby_handling(self):
        """When Gemini API key is placeholder/not configured, returns graceful standby guidance."""
        res = self.client.post(
            '/api/chatbot/ask',
            headers={'Authorization': f'Bearer {self.student_token}'},
            json={'message': 'When is the hackathon deadline?'}
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'success')
        self.assertIn('answer', data)
        self.assertIsInstance(data.get('sources'), list)
        print(f"  ✓ test_04: Standby/graceful handling verified (configured={data.get('gemini_configured')})")

    def test_05_indexing_unapproved_document_blocked(self):
        """Unapproved document cannot be indexed."""
        # Insert a pending document
        doc_id = execute_db(
            """
            INSERT INTO documents (
                title, original_filename, stored_path, uploaded_by, uploader_role, approval_status, indexing_status
            ) VALUES (?, ?, ?, ?, 'admin', 'pending', 'not_indexed')
            """,
            ("Pending Syllabus", "syllabus.pdf", "official_docs/syllabus.pdf", self.admin_id)
        )

        res = self.client.post(
            f'/api/documents/{doc_id}/index',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'error')
        self.assertIn('approved', data.get('message').lower())
        print("  ✓ test_05: Indexing unapproved document correctly blocked")

    def test_06_decoupled_lifecycle_and_indexing_trigger(self):
        """Approving document leaves indexing separate; failure preserves approval status."""
        # Insert an approved document with non-existent or dummy file
        doc_id = execute_db(
            """
            INSERT INTO documents (
                title, original_filename, stored_path, uploaded_by, uploader_role, approval_status, indexing_status
            ) VALUES (?, ?, ?, ?, 'admin', 'approved', 'not_indexed')
            """,
            ("Approved Exam Rules", "exam_rules.pdf", "official_docs/exam_rules.pdf", self.admin_id)
        )

        res = self.client.post(
            f'/api/documents/{doc_id}/index',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )
        # Returns 200 or 400 with status info
        self.assertIn(res.status_code, (200, 400))

        # Verify that approval_status in DB is STILL 'approved' (decoupled lifecycle!)
        doc = query_db("SELECT approval_status, indexing_status FROM documents WHERE id = ?", (doc_id,), one=True)
        self.assertEqual(doc['approval_status'], 'approved')
        print("  ✓ test_06: Decoupled lifecycle verified (document remains approved)")
        print("  ✓ test_06: Decoupled lifecycle verified (document remains approved)")


if __name__ == '__main__':
    print("=" * 65)
    print("RUNNING PHASE 5 AUTOMATED VERIFICATION SUITE")
    print("=" * 65)
    unittest.main()
