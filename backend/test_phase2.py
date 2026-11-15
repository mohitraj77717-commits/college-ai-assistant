"""
Phase 2 Authentication & RBAC Automated Test Suite
Runs in an isolated test database (test_college.db) so it never overwrites your dev college.db!
Run this file with: python backend/test_phase2.py
"""
import os
import sys
import sqlite3
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from config import Config

# Point to an isolated test database
TEST_DB_PATH = str(backend_dir / 'test_college.db')
Config.DATABASE_PATH = TEST_DB_PATH

from app import app
from database import init_db, query_db

def run_tests():
    print("=" * 65)
    print("RUNNING CAMPUSAI PHASE 2 AUTHENTICATION & RBAC TEST SUITE")
    print(f"Isolated Test Database: {TEST_DB_PATH}")
    print("=" * 65)

    # Initialize clean test schema
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

    init_db()
    client = app.test_client()

    print("[0/5] Isolated test database initialized.")

    # Step 1: Test Student Registration & Login
    print("\n[1/5] Testing Student Registration & Onboarding...")
    reg_res = client.post('/api/auth/student/register', json={
        'name': 'Aarav Sharma',
        'email': 'aarav@example.com',
        'roll_number': 'CS2026-042',
        'course': 'B.Tech Computer Science & Engineering (AI & ML)',
        'password': 'StudentSecret123',
        'interests': ['AI/ML', 'Coding', 'Robotics']
    })
    assert reg_res.status_code == 201, f"Student registration failed: {reg_res.get_json()}"
    student_token = reg_res.get_json()['token']
    print("  ✓ Student registered successfully. Auth token issued.")

    # Verify student preferences in SQLite
    pref = query_db("SELECT * FROM student_preferences WHERE student_id = ?", (reg_res.get_json()['user']['id'],), one=True)
    assert pref is not None, "student_preferences row was not created!"
    assert 'AI/ML' in pref['interests'], "Interest tags not saved!"
    print("  ✓ Student course & interest preferences verified in SQLite.")

    # Test student login
    s_login = client.post('/api/auth/student/login', json={
        'identifier': 'CS2026-042',
        'password': 'StudentSecret123'
    })
    assert s_login.status_code == 200, "Student login with roll number failed!"
    print("  ✓ Student login using roll number verified.")

    # Step 2: Test Teacher Registration & Approval Gate
    print("\n[2/5] Testing Teacher Registration & Mandatory Pending Status...")
    t_reg = client.post('/api/auth/teacher/register', json={
        'name': 'Dr. Priya Raman',
        'email': 'priya.raman@university.edu',
        'department': 'Computer Science & Engineering',
        'password': 'TeacherPass2026'
    })
    assert t_reg.status_code == 201
    assert t_reg.get_json()['approval_status'] == 'pending'
    print("  ✓ Teacher registered with approval_status = 'pending'.")

    # Verify teacher login is BLOCKED
    t_blocked = client.post('/api/auth/teacher/login', json={
        'email': 'priya.raman@university.edu',
        'password': 'TeacherPass2026'
    })
    assert t_blocked.status_code == 403, "Pending teacher was allowed to log in! Must be 403!"
    assert t_blocked.get_json()['error'] == 'AccountPendingApproval'
    print("  ✓ Pending teacher login blocked with HTTP 403 (AccountPendingApproval).")

    # Step 3: Test Administrator Bootstrap Setup
    print("\n[3/5] Testing Administrator Bootstrap Setup...")
    admin_setup = client.post('/api/auth/admin/setup', json={
        'setup_key': Config.ADMIN_SETUP_KEY,
        'name': 'Prof. Rajesh Gupta',
        'email': 'admin@university.edu',
        'password': 'AdminSecurePassword2026'
    })
    assert admin_setup.status_code == 201, f"Admin setup failed: {admin_setup.get_json()}"
    admin_token = admin_setup.get_json()['token']
    print("  ✓ Initial administrator bootstrapped using ADMIN_SETUP_KEY.")

    # Verify that second setup attempt is locked
    second_setup = client.post('/api/auth/admin/setup', json={
        'setup_key': Config.ADMIN_SETUP_KEY,
        'name': 'Attacker Admin',
        'email': 'attacker@bad.org',
        'password': 'Password123'
    })
    assert second_setup.status_code == 403, "Second admin setup was not blocked!"
    print("  ✓ Secondary admin setup permanently locked with HTTP 403.")

    # Step 4: Test Administrator Approving Teacher
    print("\n[4/5] Testing Admin Approving Teacher...")
    pending_list_res = client.get('/api/admin/teachers/pending', headers={'Authorization': f'Bearer {admin_token}'})
    assert pending_list_res.status_code == 200
    pending_teachers = pending_list_res.get_json()['teachers']
    assert len(pending_teachers) == 1
    teacher_id = pending_teachers[0]['id']
    print(f"  ✓ Admin viewed approval queue (found {pending_teachers[0]['name']}).")

    approve_res = client.post(f'/api/admin/teachers/{teacher_id}/approve', headers={'Authorization': f'Bearer {admin_token}'})
    assert approve_res.status_code == 200
    print("  ✓ Admin approved teacher account.")

    # Now teacher CAN log in
    t_login_ok = client.post('/api/auth/teacher/login', json={
        'email': 'priya.raman@university.edu',
        'password': 'TeacherPass2026'
    })
    assert t_login_ok.status_code == 200
    print("  ✓ Approved teacher logged in successfully. Auth token issued.")

    # Step 5: Test Role-Based Access Control (RBAC)
    print("\n[5/5] Testing Role-Based Access Control (RBAC) Security...")
    s_rbac = client.get('/api/admin/teachers/pending', headers={'Authorization': f'Bearer {student_token}'})
    assert s_rbac.status_code == 403
    print("  ✓ Student blocked from Admin API with HTTP 403.")

    # Clean up test DB
    try:
        os.remove(TEST_DB_PATH)
    except Exception:
        pass

    print("\n" + "=" * 65)
    print("ALL PHASE 2 TESTS PASSED! DEV DATABASE WAS UNTOUCHED!")
    print("=" * 65)

if __name__ == '__main__':
    run_tests()
