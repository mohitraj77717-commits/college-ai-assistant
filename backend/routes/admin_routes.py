from flask import Blueprint, request, jsonify
from database import query_db, execute_db
from auth import role_required
from services.notification_service import fanout_announcement_notifications

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


# =====================================================================
# Teacher Account Approvals (Phase 2 Requirement)
# =====================================================================

@admin_bp.route('/teachers/pending', methods=['GET'])
@role_required('admin')
def get_pending_teachers():
    """List all teacher registrations pending administrator review."""
    teachers = query_db(
        """
        SELECT id, name, email, department, approval_status, created_at
        FROM teachers
        WHERE approval_status = 'pending'
        ORDER BY created_at DESC
        """
    )
    return jsonify({
        'status': 'success',
        'count': len(teachers),
        'teachers': teachers
    }), 200


@admin_bp.route('/teachers', methods=['GET'])
@role_required('admin')
def get_all_teachers():
    """List all teachers regardless of approval status."""
    status_filter = request.args.get('status')
    if status_filter:
        teachers = query_db(
            """
            SELECT id, name, email, department, approval_status, created_at
            FROM teachers
            WHERE approval_status = ?
            ORDER BY created_at DESC
            """,
            (status_filter,)
        )
    else:
        teachers = query_db(
            """
            SELECT id, name, email, department, approval_status, created_at
            FROM teachers
            ORDER BY created_at DESC
            """
        )

    return jsonify({
        'status': 'success',
        'count': len(teachers),
        'teachers': teachers
    }), 200


@admin_bp.route('/teachers/<int:teacher_id>/approve', methods=['POST'])
@role_required('admin')
def approve_teacher(teacher_id: int):
    """Approve a pending teacher account."""
    teacher = query_db("SELECT id, name, email FROM teachers WHERE id = ?", (teacher_id,), one=True)
    if not teacher:
        return jsonify({'status': 'error', 'message': 'Teacher account not found.'}), 404

    execute_db("UPDATE teachers SET approval_status = 'approved' WHERE id = ?", (teacher_id,))

    return jsonify({
        'status': 'success',
        'message': f"Teacher '{teacher['name']}' has been approved and may now log in.",
        'teacher_id': teacher_id,
        'approval_status': 'approved'
    }), 200


@admin_bp.route('/teachers/<int:teacher_id>/reject', methods=['POST'])
@role_required('admin')
def reject_teacher(teacher_id: int):
    """Reject a teacher registration application."""
    teacher = query_db("SELECT id, name, email FROM teachers WHERE id = ?", (teacher_id,), one=True)
    if not teacher:
        return jsonify({'status': 'error', 'message': 'Teacher account not found.'}), 404

    execute_db("UPDATE teachers SET approval_status = 'rejected' WHERE id = ?", (teacher_id,))

    return jsonify({
        'status': 'success',
        'message': f"Teacher application for '{teacher['name']}' has been rejected.",
        'teacher_id': teacher_id,
        'approval_status': 'rejected'
    }), 200


# =====================================================================
# Teacher Submissions Review (Phase 3 Requirement)
# =====================================================================

@admin_bp.route('/submissions', methods=['GET'])
@role_required('admin')
def get_teacher_submissions():
    """
    List teacher submissions pending administrator review.
    Supports filtering by ?status=pending|approved|rejected
    """
    status_filter = request.args.get('status', 'pending')
    query = """
        SELECT s.id, s.teacher_id, s.title, s.description, s.category,
               s.event_date, s.deadline, s.registration_link, s.course,
               s.document_path, s.submission_status, s.admin_feedback,
               s.submitted_at, s.reviewed_at,
               t.name AS teacher_name, t.department AS teacher_department, t.email AS teacher_email
        FROM teacher_submissions s
        JOIN teachers t ON s.teacher_id = t.id
    """
    params = []
    if status_filter and status_filter.lower() != 'all':
        query += " WHERE s.submission_status = ?"
        params.append(status_filter.lower())

    query += " ORDER BY s.submitted_at DESC"
    submissions = query_db(query, params)

    return jsonify({
        'status': 'success',
        'count': len(submissions),
        'submissions': submissions
    }), 200


@admin_bp.route('/submissions/<int:submission_id>/review', methods=['POST'])
@role_required('admin')
def review_teacher_submission(submission_id: int):
    """
    Approve or reject a teacher's announcement/document submission.
    - If approved: automatically publishes the announcement to students.
    - If rejected: stores administrator feedback for the teacher.
    """
    data = request.get_json() or {}
    action = data.get('action', '').strip().lower()  # 'approve' | 'reject'
    feedback = data.get('feedback', '').strip()

    if action not in ('approve', 'reject'):
        return jsonify({'status': 'error', 'message': "Action must be either 'approve' or 'reject'."}), 400

    submission = query_db(
        "SELECT * FROM teacher_submissions WHERE id = ?",
        (submission_id,),
        one=True
    )
    if not submission:
        return jsonify({'status': 'error', 'message': 'Submission not found.'}), 404

    if action == 'approve':
        # 1. Update submission status
        execute_db(
            """
            UPDATE teacher_submissions
            SET submission_status = 'approved', admin_feedback = ?, reviewed_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (feedback or 'Approved by administrator.', submission_id)
        )

        # 2. Publish to announcements table
        announcement_id = execute_db(
            """
            INSERT INTO announcements (
                title, description, category, event_date, deadline,
                registration_link, course, created_by_role, created_by_id, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'teacher', ?, 'published')
            """,
            (
                submission['title'],
                submission['description'],
                submission['category'],
                submission['event_date'],
                submission['deadline'],
                submission['registration_link'],
                submission['course'],
                submission['teacher_id']
            )
        )

        # 3. If there is an attached document, update its approval_status in documents table
        if submission['document_path']:
            execute_db(
                "UPDATE documents SET approval_status = 'approved' WHERE stored_path = ?",
                (submission['document_path'],)
            )

        # 4. Phase 4: Intelligently generate notifications for eligible students
        notif_count = fanout_announcement_notifications(announcement_id)

        return jsonify({
            'status': 'success',
            'message': f"Submission '{submission['title']}' approved and published to announcements.",
            'submission_id': submission_id,
            'announcement_id': announcement_id,
            'notifications_sent': notif_count,
            'action': 'approved'
        }), 200

    else: # reject
        if not feedback:
            feedback = 'Submission rejected by administrator. Please update details and resubmit.'

        execute_db(
            """
            UPDATE teacher_submissions
            SET submission_status = 'rejected', admin_feedback = ?, reviewed_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (feedback, submission_id)
        )

        if submission['document_path']:
            execute_db(
                "UPDATE documents SET approval_status = 'rejected' WHERE stored_path = ?",
                (submission['document_path'],)
            )

        return jsonify({
            'status': 'success',
            'message': f"Submission '{submission['title']}' rejected with feedback provided.",
            'submission_id': submission_id,
            'action': 'rejected',
            'feedback': feedback
        }), 200


@admin_bp.route('/announcements/create', methods=['POST'])
@role_required('admin')
def admin_create_announcement():
    """
    Administrator directly creates and publishes an official announcement.
    """
    admin_id = request.current_user['id']
    data = request.get_json() or {}

    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    category = data.get('category', '').strip().lower()
    event_date = data.get('event_date', '').strip() or None
    deadline = data.get('deadline', '').strip() or None
    registration_link = data.get('registration_link', '').strip() or None
    course = data.get('course', 'All').strip() or 'All'

    if not title or not description or not category:
        return jsonify({'status': 'error', 'message': 'Title, description, and category are required.'}), 400

    announcement_id = execute_db(
        """
        INSERT INTO announcements (
            title, description, category, event_date, deadline,
            registration_link, course, created_by_role, created_by_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', ?, 'published')
        """,
        (title, description, category, event_date, deadline, registration_link, course, admin_id)
    )

    # Phase 4: Intelligently generate notifications for eligible students
    notif_count = fanout_announcement_notifications(announcement_id)

    return jsonify({
        'status': 'success',
        'message': f"Official announcement '{title}' published successfully.",
        'announcement_id': announcement_id,
        'notifications_sent': notif_count
    }), 201


# =====================================================================
# Basic System Stats (Phase 2/3)
# =====================================================================

@admin_bp.route('/stats', methods=['GET'])
@role_required('admin')
def get_system_stats():
    """
    Aggregate statistics for the administrator dashboard.
    """
    student_count = query_db("SELECT COUNT(*) AS c FROM students", one=True)['c']
    approved_teachers = query_db("SELECT COUNT(*) AS c FROM teachers WHERE approval_status = 'approved'", one=True)['c']
    pending_teachers = query_db("SELECT COUNT(*) AS c FROM teachers WHERE approval_status = 'pending'", one=True)['c']
    announcements_count = query_db("SELECT COUNT(*) AS c FROM announcements WHERE status = 'published'", one=True)['c']
    documents_count = query_db("SELECT COUNT(*) AS c FROM documents", one=True)['c']
    pending_submissions = query_db("SELECT COUNT(*) AS c FROM teacher_submissions WHERE submission_status = 'pending'", one=True)['c']

    return jsonify({
        'status': 'success',
        'stats': {
            'students': student_count,
            'approved_teachers': approved_teachers,
            'pending_teachers': pending_teachers,
            'published_announcements': announcements_count,
            'uploaded_documents': documents_count,
            'pending_submissions': pending_submissions
        }
    }), 200
