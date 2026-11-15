"""
Phase 3 Core Features & Workflows Automated Test Suite
Runs in an isolated test database (test_phase3.db) to keep dev database pristine.
Run with: python backend/test_phase3.py
"""
import io
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from config import Config

# Isolated test DB
TEST_DB_PATH = str(backend_dir / 'test_phase3.db')
Config.DATABASE_PATH = TEST_DB_PATH

from app import app
from database import init_db, query_db

def create_dummy_pdf_bytes():
    """Create a minimal valid PDF header byte stream for testing."""
    return io.BytesIO(b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF")

def run_tests():
    print("=" * 65)
    print("RUNNING CAMPUSAI PHASE 3 CORE FEATURES & WORKFLOWS TEST SUITE")
    print(f"Isolated Test Database: {TEST_DB_PATH}")
    print("=" * 65)

    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

    init_db()
    client = app.test_client()

    print("[0/6] Initialized test database.")

    # 1. Setup Admin, Teacher, and Student
    print("\n[1/6] Bootstrapping test users (Admin, Approved Teacher, Student)...")
    admin_res = client.post('/api/auth/admin/setup', json={
        'setup_key': Config.ADMIN_SETUP_KEY,
        'name': 'Dean Academics',
        'email': 'admin@university.edu',
        'password': 'AdminSecurePassword2026'
    })
    admin_token = admin_res.get_json()['token']

    t_reg = client.post('/api/auth/teacher/register', json={
        'name': 'Dr. Alok Verma',
        'email': 'alok@university.edu',
        'department': 'Computer Science & Engineering',
        'password': 'TeacherPass123'
    })
    teacher_id = query_db("SELECT id FROM teachers WHERE email = ?", ('alok@university.edu',), one=True)['id']
    client.post(f'/api/admin/teachers/{teacher_id}/approve', headers={'Authorization': f'Bearer {admin_token}'})
    t_login = client.post('/api/auth/teacher/login', json={'email': 'alok@university.edu', 'password': 'TeacherPass123'})
    teacher_token = t_login.get_json()['token']

    s_reg = client.post('/api/auth/student/register', json={
        'name': 'Aarav Sharma',
        'email': 'aarav@example.com',
        'roll_number': 'CS2026-042',
        'course': 'B.Tech Computer Science & Engineering (AI & ML)',
        'password': 'StudentSecret123',
        'interests': ['AI/ML', 'Coding']
    })
    student_token = s_reg.get_json()['token']
    print("  ✓ Admin, approved teacher, and student tokens generated.")

    # 2. Test Admin Direct PDF Upload (Bypassing Teacher)
    print("\n[2/6] Testing Administrator Direct Official PDF Upload...")
    pdf_stream = create_dummy_pdf_bytes()
    upload_res = client.post(
        '/api/documents/admin-upload',
        headers={'Authorization': f'Bearer {admin_token}'},
        data={
            'title': 'Academic Calendar 2026-2027',
            'file': (pdf_stream, 'Academic_Calendar_2026.pdf')
        },
        content_type='multipart/form-data'
    )
    assert upload_res.status_code == 201, f"Admin upload failed: {upload_res.get_json()}"
    admin_doc_id = upload_res.get_json()['document_id']
    assert upload_res.get_json()['approval_status'] == 'approved'
    assert upload_res.get_json()['indexing_status'] == 'not_indexed'
    print(f"  ✓ Admin uploaded official document (ID: {admin_doc_id}) with approval_status = 'approved'.")

    # 3. Test Teacher Announcement & Notice PDF Submission
    print("\n[3/6] Testing Teacher Notice & PDF Submission...")
    notice_stream = create_dummy_pdf_bytes()
    sub_res = client.post(
        '/api/teacher/submit',
        headers={'Authorization': f'Bearer {teacher_token}'},
        data={
            'title': 'National AI Hackathon 2026',
            'description': '48-hour university hackathon for AI and Machine Learning students.',
            'category': 'ai-ml',
            'event_date': '2026-12-05',
            'deadline': '2026-11-28',
            'registration_link': 'https://hackathon.example.edu/register',
            'course': 'All',
            'document': (notice_stream, 'Hackathon_Rules.pdf')
        },
        content_type='multipart/form-data'
    )
    assert sub_res.status_code == 201, f"Teacher submit failed: {sub_res.get_json()}"
    submission_id = sub_res.get_json()['submission_id']
    print(f"  ✓ Teacher submitted announcement draft (ID: {submission_id}) with attached PDF.")

    # Verify teacher sees it in "My Submissions" as pending
    my_subs_res = client.get('/api/teacher/my-submissions', headers={'Authorization': f'Bearer {teacher_token}'})
    assert my_subs_res.status_code == 200
    my_subs = my_subs_res.get_json()['submissions']
    assert len(my_subs) == 1
    assert my_subs[0]['submission_status'] == 'pending'
    print("  ✓ Submission appears in teacher's 'My Submissions' with status = 'pending'.")

    # Verify unapproved submission is NOT in student announcements feed!
    feed_res = client.get('/api/announcements')
    assert feed_res.status_code == 200
    assert len(feed_res.get_json()['announcements']) == 0
    print("  ✓ Unapproved teacher submission is NOT visible in public/student announcements feed.")

    # 4. Test Administrator Review & Approval
    print("\n[4/6] Testing Administrator Review & Approval Workflow...")
    admin_subs = client.get('/api/admin/submissions?status=pending', headers={'Authorization': f'Bearer {admin_token}'})
    assert admin_subs.status_code == 200
    assert len(admin_subs.get_json()['submissions']) == 1
    print("  ✓ Admin retrieved pending teacher submissions queue.")

    # Admin approves submission
    approve_sub = client.post(
        f'/api/admin/submissions/{submission_id}/review',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'action': 'approve', 'feedback': 'Approved. Excellent event for students.'}
    )
    assert approve_sub.status_code == 200
    announcement_id = approve_sub.get_json()['announcement_id']
    print(f"  ✓ Admin approved submission. Announcement published with ID: {announcement_id}.")

    # 5. Student Views Published Announcement
    print("\n[5/6] Testing Student Announcement Discovery...")
    student_feed = client.get('/api/announcements?category=ai-ml')
    assert student_feed.status_code == 200
    items = student_feed.get_json()['announcements']
    assert len(items) == 1
    assert items[0]['title'] == 'National AI Hackathon 2026'
    assert items[0]['registration_link'] == 'https://hackathon.example.edu/register'
    print(f"  ✓ Student successfully discovered published announcement: '{items[0]['title']}'.")

    # 6. Test Teacher Submission Rejection with Feedback
    print("\n[6/6] Testing Teacher Submission Rejection with Admin Feedback...")
    sub2_res = client.post(
        '/api/teacher/submit',
        headers={'Authorization': f'Bearer {teacher_token}'},
        json={
            'title': 'RoboWars Workshop',
            'description': 'Introductory workshop on combat robotics.',
            'category': 'robotics',
            'course': 'All'
        }
    )
    sub2_id = sub2_res.get_json()['submission_id']

    # Admin rejects submission with constructive feedback
    reject_res = client.post(
        f'/api/admin/submissions/{sub2_id}/review',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={'action': 'reject', 'feedback': 'Please add the lab venue and registration deadline before resubmitting.'}
    )
    assert reject_res.status_code == 200
    print("  ✓ Admin rejected submission with feedback note.")

    # Teacher inspects feedback
    t_history = client.get('/api/teacher/my-submissions', headers={'Authorization': f'Bearer {teacher_token}'})
    rejected_item = [s for s in t_history.get_json()['submissions'] if s['id'] == sub2_id][0]
    assert rejected_item['submission_status'] == 'rejected'
    assert 'lab venue' in rejected_item['admin_feedback']
    print("  ✓ Teacher can inspect rejection status and administrator feedback in dashboard.")

    # Clean up test DB
    try:
        os.remove(TEST_DB_PATH)
    except Exception:
        pass

    print("\n" + "=" * 65)
    print("ALL PHASE 3 TESTS PASSED! CORE WORKFLOWS ARE FULLY VERIFIED!")
    print("=" * 65)

if __name__ == '__main__':
    run_tests()
