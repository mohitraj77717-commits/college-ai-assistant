import json
from database import query_db, execute_db

def fanout_announcement_notifications(announcement_id: int) -> int:
    """
    Intelligently distribute notifications for a published announcement.
    - Matches student course and/or student interests.
    - Respects student notification preferences (event vs academic).
    - Guarantees zero duplicate notifications for the same announcement and student.
    Returns the number of notifications generated.
    """
    announcement = query_db(
        "SELECT id, title, description, category, course FROM announcements WHERE id = ?",
        (announcement_id,),
        one=True
    )
    if not announcement:
        return 0

    category = announcement['category'].lower()
    target_course = announcement['course']

    # Determine notification type
    if category in ('academic', 'exam', 'examination'):
        notification_type = 'academic'
    else:
        notification_type = 'event'

    # Query all students with their preferences
    students_with_prefs = query_db(
        """
        SELECT s.id AS student_id, s.name, s.course,
               p.interests, p.event_notifications_enabled, p.academic_notifications_enabled
        FROM students s
        LEFT JOIN student_preferences p ON s.id = p.student_id
        """
    )

    notifications_created = 0

    for s in students_with_prefs:
        student_id = s['student_id']
        event_enabled = bool(s.get('event_notifications_enabled', 1))
        academic_enabled = bool(s.get('academic_notifications_enabled', 1))

        # Check 1: Respect notification preferences
        if notification_type == 'academic' and not academic_enabled:
            continue
        if notification_type == 'event' and not event_enabled:
            continue

        # Check 2: Determine eligibility
        # Eligible if:
        # a) Target course is 'All'
        # b) Target course matches student course
        # c) Announcement category matches student's interests
        is_course_match = (target_course == 'All') or (s['course'] and target_course.lower() in s['course'].lower())

        student_interests = []
        if s.get('interests'):
            try:
                student_interests = json.loads(s['interests']) if isinstance(s['interests'], str) else s['interests']
                student_interests = [i.lower() for i in student_interests]
            except Exception:
                student_interests = []

        is_interest_match = any(
            cat_keyword in interest or interest in cat_keyword
            for interest in student_interests
            for cat_keyword in [category]
        )

        # Student is eligible if either course or interest matches
        if not (is_course_match or is_interest_match):
            continue

        # Check 3: Prevent duplicate notifications
        already_sent = query_db(
            "SELECT id FROM notifications WHERE student_id = ? AND announcement_id = ?",
            (student_id, announcement_id),
            one=True
        )
        if already_sent:
            continue

        # Generate notification message
        msg_snippet = announcement['description'][:140] + ('...' if len(announcement['description']) > 140 else '')

        execute_db(
            """
            INSERT INTO notifications (student_id, announcement_id, title, message, notification_type, is_read)
            VALUES (?, ?, ?, ?, ?, 0)
            """,
            (
                student_id,
                announcement_id,
                announcement['title'],
                msg_snippet,
                notification_type
            )
        )
        notifications_created += 1

    return notifications_created


def fanout_document_notifications(document_id: int) -> int:
    """
    Distribute academic notifications when an official college document (like a routine, timetable, or syllabus)
    is uploaded or approved by the administrator.
    Notifies all students who have academic_notifications_enabled = 1.
    """
    doc = query_db(
        "SELECT id, title, original_filename FROM documents WHERE id = ?",
        (document_id,),
        one=True
    )
    if not doc:
        return 0

    students = query_db(
        """
        SELECT s.id AS student_id, s.name, s.course,
               p.academic_notifications_enabled
        FROM students s
        LEFT JOIN student_preferences p ON s.id = p.student_id
        """
    ) or []

    notifications_created = 0
    doc_title = doc['title']
    notif_title = f"New Academic Document: {doc_title}"

    for s in students:
        student_id = s['student_id']
        academic_enabled = bool(s.get('academic_notifications_enabled', 1))

        if not academic_enabled:
            continue

        # Prevent duplicate notifications for same document and student
        already_sent = query_db(
            "SELECT id FROM notifications WHERE student_id = ? AND title = ?",
            (student_id, notif_title),
            one=True
        )
        if already_sent:
            continue

        msg = f"Official academic document '{doc_title}' ({doc['original_filename']}) has been uploaded and is now available in your portal."

        execute_db(
            """
            INSERT INTO notifications (student_id, announcement_id, title, message, notification_type, is_read)
            VALUES (?, NULL, ?, ?, 'academic', 0)
            """,
            (
                student_id,
                notif_title,
                msg
            )
        )
        notifications_created += 1

    return notifications_created
