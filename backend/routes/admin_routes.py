from flask import Blueprint, request, jsonify
from database import query_db, execute_db
from auth import role_required

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


# =====================================================================
# Teacher Account Approvals (Phase 2 Requirement)
# =====================================================================

@admin_bp.route('/teachers/pending', methods=['GET'])
@role_required('admin')
def get_pending_teachers():
    """
    List all teacher registrations pending administrator review.
    Accessible only by administrators.
    """
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
    """
    List all teachers regardless of approval status.
    Filterable by ?status=pending|approved|rejected
    """
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
    """
    Approve a pending teacher account.
    Once approved, the teacher can log in and submit notices.
    """
    teacher = query_db("SELECT id, name, email, approval_status FROM teachers WHERE id = ?", (teacher_id,), one=True)
    if not teacher:
        return jsonify({'status': 'error', 'message': 'Teacher account not found.'}), 404

    execute_db(
        "UPDATE teachers SET approval_status = 'approved' WHERE id = ?",
        (teacher_id,)
    )

    return jsonify({
        'status': 'success',
        'message': f"Teacher '{teacher['name']}' has been approved and may now log in.",
        'teacher_id': teacher_id,
        'approval_status': 'approved'
    }), 200


@admin_bp.route('/teachers/<int:teacher_id>/reject', methods=['POST'])
@role_required('admin')
def reject_teacher(teacher_id: int):
    """
    Reject a teacher registration application.
    """
    teacher = query_db("SELECT id, name, email FROM teachers WHERE id = ?", (teacher_id,), one=True)
    if not teacher:
        return jsonify({'status': 'error', 'message': 'Teacher account not found.'}), 404

    execute_db(
        "UPDATE teachers SET approval_status = 'rejected' WHERE id = ?",
        (teacher_id,)
    )

    return jsonify({
        'status': 'success',
        'message': f"Teacher application for '{teacher['name']}' has been rejected.",
        'teacher_id': teacher_id,
        'approval_status': 'rejected'
    }), 200


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
