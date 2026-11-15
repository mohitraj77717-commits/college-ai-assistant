"""
Automated Verification Suite for Phase 6 (Data Import & Demo Datasets)
Tests:
1. Previewing a valid CSV with Pandas
2. Detecting invalid rows (missing fields, invalid email format)
3. In-file duplicate detection (duplicate roll number / email in same file)
4. Existing database duplicate rejection
5. Batch confirmation and automatic student_preferences record creation
6. Clean up of test_phase6.db
"""

import io
import os
import sys
import unittest
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Configure test database before importing app
TEST_DB = backend_dir / "test_phase6.db"
os.environ["DATABASE_NAME"] = "test_phase6.db"

from app import create_app
from database import init_db, execute_db, query_db
from config import Config
from auth import generate_token, hash_password


class Phase6TestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if TEST_DB.exists():
            try:
                TEST_DB.unlink()
            except Exception:
                pass

        Config.DATABASE_NAME = "test_phase6.db"
        Config.DATABASE_PATH = str(TEST_DB)

        cls.app = create_app()
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            init_db()
            # Seed test admin
            cls.admin_id = execute_db(
                "INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)",
                ("Admin User", "admin@college.edu", hash_password("AdminPass123"))
            )
            cls.admin_token = generate_token(cls.admin_id, "admin", "admin@college.edu")

            # Seed an existing student to test duplicate detection
            execute_db(
                "INSERT INTO students (name, email, roll_number, course, password_hash) VALUES (?, ?, ?, ?, ?)",
                ("Pre-existing Student", "existing@college.edu", "ROLL-001", "B.Tech CSE", hash_password("pass"))
            )

    @classmethod
    def tearDownClass(cls):
        import gc
        gc.collect()
        if TEST_DB.exists():
            try:
                TEST_DB.unlink()
            except Exception:
                pass

    def test_01_preview_valid_csv(self):
        """Previewing a clean CSV file should mark all rows as valid."""
        csv_data = (
            "Name,Email,Roll Number,Course\n"
            "Student Alpha,alpha@example.com,ROLL-101,B.Tech CSE\n"
            "Student Beta,beta@example.com,ROLL-102,B.Tech AI-ML\n"
        )
        file_obj = (io.BytesIO(csv_data.encode('utf-8')), 'students.csv')

        res = self.client.post(
            '/api/admin/import/preview',
            headers={'Authorization': f'Bearer {self.admin_token}'},
            data={'file': file_obj},
            content_type='multipart/form-data'
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('status'), 'success')
        self.assertEqual(data.get('valid_count'), 2)
        self.assertEqual(data.get('invalid_count'), 0)
        print("  ✓ test_01: Valid CSV successfully previewed with 2 valid rows")

    def test_02_detect_invalid_rows_and_missing_fields(self):
        """Rows with missing fields or malformed emails should be flagged as invalid."""
        csv_data = (
            "name,email,roll_number,course\n"
            ",no_name@example.com,ROLL-201,B.Tech\n"  # Missing name
            "Valid Student,valid@example.com,ROLL-202,B.Tech\n"
            "Bad Email,invalid-email-no-at,ROLL-203,B.Tech\n"  # Invalid email format
        )
        file_obj = (io.BytesIO(csv_data.encode('utf-8')), 'partial.csv')

        res = self.client.post(
            '/api/admin/import/preview',
            headers={'Authorization': f'Bearer {self.admin_token}'},
            data={'file': file_obj},
            content_type='multipart/form-data'
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('valid_count'), 1)
        self.assertEqual(data.get('invalid_count'), 2)
        print("  ✓ test_02: Missing fields & malformed emails flagged in invalid_rows")

    def test_03_detect_infile_and_db_duplicates(self):
        """Detect duplicate emails/roll numbers both within the file and against SQLite."""
        csv_data = (
            "name,email,roll_number,course\n"
            "Existing Email,existing@college.edu,ROLL-301,B.Tech\n"  # Collides with DB email
            "Existing Roll,new@college.edu,ROLL-001,B.Tech\n"        # Collides with DB roll
            "First Copy,copy@college.edu,ROLL-302,B.Tech\n"
            "Second Copy,copy@college.edu,ROLL-303,B.Tech\n"         # Collides with previous row email
        )
        file_obj = (io.BytesIO(csv_data.encode('utf-8')), 'duplicates.csv')

        res = self.client.post(
            '/api/admin/import/preview',
            headers={'Authorization': f'Bearer {self.admin_token}'},
            data={'file': file_obj},
            content_type='multipart/form-data'
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('valid_count'), 1)  # Only First Copy is valid
        self.assertEqual(data.get('invalid_count'), 3)
        print("  ✓ test_03: In-file and database duplicates correctly identified")

    def test_04_confirm_import_and_verify_preferences(self):
        """Confirming import inserts students into SQLite and creates their default preferences."""
        students_to_import = [
            {
                "name": "Imported Student 1",
                "email": "imported1@college.edu",
                "roll_number": "IMP-001",
                "course": "B.Tech CSE (AI & ML)",
                "password": "Password123"
            },
            {
                "name": "Imported Student 2",
                "email": "imported2@college.edu",
                "roll_number": "IMP-002",
                "course": "B.Tech Robotics",
                "password": "Password123"
            }
        ]

        res = self.client.post(
            '/api/admin/import/confirm',
            headers={'Authorization': f'Bearer {self.admin_token}'},
            json={'students': students_to_import}
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get('imported_count'), 2)

        # Verify students exist in DB
        s1 = query_db("SELECT id, name, email FROM students WHERE email = 'imported1@college.edu'", one=True)
        self.assertIsNotNone(s1)
        self.assertEqual(s1['name'], "Imported Student 1")

        # Verify student_preferences was automatically generated
        pref = query_db("SELECT student_id, interests FROM student_preferences WHERE student_id = ?", (s1['id'],), one=True)
        self.assertIsNotNone(pref)
        self.assertIn("AI/ML", pref['interests'])
        print("  ✓ test_04: Batch confirm inserted students and initialized preferences")


if __name__ == '__main__':
    print("=" * 65)
    print("RUNNING PHASE 6 AUTOMATED VERIFICATION SUITE")
    print("=" * 65)
    unittest.main()
