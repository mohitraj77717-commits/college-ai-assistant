"""
Phase 4 Notifications & Preferences Automated Test Suite
Runs in an isolated test database (test_phase4.db).
Run with: python backend/test_phase4.py
"""
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from config import Config

TEST_DB_PATH = str(backend_dir / 'test_phase4.db')
Config.DATABASE_PATH = TEST_DB_PATH

from app import app
from database import init_db, query_db

def run_tests():
    print("=" * 65)
    print("RUNNING CAMPUSAI PHASE 4 NOTIFICATIONS & PREFERENCES TEST SUITE")
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

    # 1. Setup Admin & 3 distinct Students
    print("\n[1/6] Bootstrapping Admin & 3 Students with varied preferences...")
    admin_res = client.post('/api/auth/admin/setup', json={
        'setup_key': Config.ADMIN_SETUP_KEY,
        'name': 'Dean Admin',
        'email': 'admin@university.edu',
        'password': 'AdminSecurePassword2026'
    })
    admin_token = admin_res.get_json()['token']

    # Student A: CSE AI&ML, Events=ON, Academic=ON
    sa_res = client.post('/api/auth/student/register', json={
        'name': 'Student A (AI/ML Enthusiast)',
        'email': 'student_a@example.com',
        'roll_number': 'CS-001',
        'course': 'B.Tech Computer Science & Engineering (AI & ML)',
        'password': 'PassStudent123',
        'interests': ['AI/ML', 'Coding']
    })
    token_a = sa_res.get_json()['token']
    id_a = sa_res.get_json()['user']['id']

    # Student B: ECE, Events=OFF, Academic=ON
    sb_res = client.post('/api/auth/student/register', json={
        'name': 'Student B (ECE Hardware Only)',
        'email': 'student_b@example.com',
        'roll_number': 'EC-002',
        'course': 'B.Tech Electronics & Communication',
        'password': 'PassStudent123',
        'interests': ['Robotics']
    })
    token_b = sb_res.get_json()['token']
    id_b = sb_res.get_json()['user']['id']
    # Explicitly turn off event notifications for Student B
    client.put('/api/student/preferences', headers={'Authorization': f'Bearer {token_b}'}, json={
        'event_notifications_enabled': False,
        'academic_notifications_enabled': True
    })

    # Student C: CSE, Events=ON, Academic=OFF
    sc_res = client.post('/api/auth/student/register', json={
        'name': 'Student C (Cultural Lead)',
        'email': 'student_c@example.com',
        'roll_number': 'CS-003',
        'course': 'B.Tech Computer Science & Engineering',
        'password': 'PassStudent123',
        'interests': ['Cultural']
    })
    token_c = sc_res.get_json()['token']
    id_c = sc_res.get_json()['user']['id']
    # Explicitly turn off academic notifications for Student C
    client.put('/api/student/preferences', headers={'Authorization': f'Bearer {token_c}'}, json={
        'event_notifications_enabled': True,
        'academic_notifications_enabled': False
    })

    print("  ✓ Bootstrapped Admin and 3 Students with customized notification toggles.")

    # 2. Publish an Event Announcement
    print("\n[2/6] Publishing an Event Announcement (AI Hackathon)...")
    event_post = client.post(
        '/api/admin/announcements/create',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={
            'title': 'Grand AI Hackathon 2026',
            'description': '48-hour competitive coding & AI sprint.',
            'category': 'ai-ml',
            'course': 'All'
        }
    )
    assert event_post.status_code == 201
    assert event_post.get_json()['notifications_sent'] >= 1
    print(f"  ✓ Announcement published. Notifications distributed: {event_post.get_json()['notifications_sent']}.")

    # Student A: should receive it (Events ON)
    count_a = client.get('/api/notifications/unread-count', headers={'Authorization': f'Bearer {token_a}'}).get_json()['unread_count']
    assert count_a == 1, f"Student A should have 1 unread notif, got {count_a}"

    # Student B: should NOT receive it (Events OFF)
    count_b = client.get('/api/notifications/unread-count', headers={'Authorization': f'Bearer {token_b}'}).get_json()['unread_count']
    assert count_b == 0, f"Student B has event notifications disabled, expected 0, got {count_b}"

    # Student C: should receive it (Course All, Events ON)
    count_c = client.get('/api/notifications/unread-count', headers={'Authorization': f'Bearer {token_c}'}).get_json()['unread_count']
    assert count_c == 1, f"Student C should have 1 unread notif, got {count_c}"
    print("  ✓ Event notification preferences verified: Student A received, Student B (disabled) skipped.")

    # 3. Deduplication Check
    print("\n[3/6] Testing Notification Deduplication...")
    from services.notification_service import fanout_announcement_notifications
    dup_count = fanout_announcement_notifications(event_post.get_json()['announcement_id'])
    assert dup_count == 0, "Duplicate notifications were created! Deduplication failed!"
    print("  ✓ Zero duplicate notifications created on re-evaluation.")

    # 4. Publish an Academic Announcement
    print("\n[4/6] Publishing an Academic Notice (Exam Schedule)...")
    acad_post = client.post(
        '/api/admin/announcements/create',
        headers={'Authorization': f'Bearer {admin_token}'},
        json={
            'title': 'End-Term Theory Examination Timetable',
            'description': 'Official datesheets published for all semesters.',
            'category': 'academic',
            'course': 'All'
        }
    )
    assert acad_post.status_code == 201

    # Student A: Academic ON -> now has 2 unread
    assert client.get('/api/notifications/unread-count', headers={'Authorization': f'Bearer {token_a}'}).get_json()['unread_count'] == 2
    # Student B: Academic ON -> now has 1 unread
    assert client.get('/api/notifications/unread-count', headers={'Authorization': f'Bearer {token_b}'}).get_json()['unread_count'] == 1
    # Student C: Academic OFF -> still has 1 unread
    assert client.get('/api/notifications/unread-count', headers={'Authorization': f'Bearer {token_c}'}).get_json()['unread_count'] == 1
    print("  ✓ Academic notifications verified: Student B received, Student C (disabled) skipped.")

    # 5. Read / Unread Functionality & Unread Count Badges
    print("\n[5/6] Testing Read/Unread Status & Count Updates...")
    notifs_res = client.get('/api/notifications', headers={'Authorization': f'Bearer {token_a}'})
    assert notifs_res.status_code == 200
    all_notifs = notifs_res.get_json()['notifications']
    assert len(all_notifs) == 2
    first_notif_id = all_notifs[0]['id']

    # Mark single notification as read
    read_res = client.put(f'/api/notifications/{first_notif_id}/read', headers={'Authorization': f'Bearer {token_a}'})
    assert read_res.status_code == 200
    unread_now = client.get('/api/notifications/unread-count', headers={'Authorization': f'Bearer {token_a}'}).get_json()['unread_count']
    assert unread_now == 1
    print(f"  ✓ Single notification marked as read. Unread badge decremented to {unread_now}.")

    # Mark all remaining notifications as read
    all_read_res = client.put('/api/notifications/mark-all-read', headers={'Authorization': f'Bearer {token_a}'})
    assert all_read_res.status_code == 200
    final_unread = client.get('/api/notifications/unread-count', headers={'Authorization': f'Bearer {token_a}'}).get_json()['unread_count']
    assert final_unread == 0
    print("  ✓ Mark-all-as-read verified. Unread badge dropped to 0.")

    # 6. Student Preference Modification
    print("\n[6/6] Testing Dynamic Student Preference Updates...")
    pref_res = client.put(
        '/api/student/preferences',
        headers={'Authorization': f'Bearer {token_a}'},
        json={
            'interests': ['Robotics', 'Cybersecurity'],
            'event_notifications_enabled': False,
            'academic_notifications_enabled': True
        }
    )
    assert pref_res.status_code == 200
    updated_prefs = pref_res.get_json()['preferences']
    assert 'Robotics' in updated_prefs['interests']
    assert updated_prefs['event_notifications_enabled'] is False
    print("  ✓ Student successfully updated notification toggles and interest tags in SQLite.")

    # Cleanup
    try:
        os.remove(TEST_DB_PATH)
    except Exception:
        pass

    print("\n" + "=" * 65)
    print("ALL PHASE 4 TESTS PASSED! NOTIFICATION ENGINE & PREFERENCES VERIFIED!")
    print("=" * 65)

if __name__ == '__main__':
    run_tests()
