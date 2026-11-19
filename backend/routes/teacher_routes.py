from flask import Blueprint, request, jsonify
from database import query_db, execute_db
from auth import role_required
from services.file_service import save_pdf_upload

teacher_bp = Blueprint('teacher', __name__, url_prefix='/api/teacher')


@teacher_bp.route('/submit', methods=['POST'])
@role_required('teacher')
def submit_announcement():
    """
    Teacher submits a college announcement draft and optional PDF notice.
    Submissions are stored with status 'pending' awaiting administrator approval.
    """
    current_teacher = request.current_user
    teacher_id = current_teacher['id']

    # Read form data (supports both multipart/form-data and JSON)
    if request.is_json:
        data = request.get_json() or {}
        uploaded_file = None
    else:
        data = request.form.to_dict()
        uploaded_file = request.files.get('document') or request.files.get('file')

    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    category = data.get('category', '').strip().lower()
    announcement_type = data.get('announcement_type', '').strip().lower()
    event_date = data.get('event_date', '').strip() or None
    deadline = data.get('deadline', '').strip() or None
    registration_link = data.get('registration_link', '').strip() or None
    course = data.get('course', 'All').strip() or 'All'

    # Validation
    if not title or not description or not category:
        return jsonify({
            'status': 'error',
            'message': 'Title, description, and category are required.'
        }), 400

    if announcement_type not in ('event', 'academic'):
        announcement_type = 'academic' if category in ('academic', 'exam', 'examination', 'general') else 'event'

    saved_doc_path = None
    original_filename = None

    # Handle optional attached notice PDF
    if uploaded_file and uploaded_file.filename:
        try:
            saved = save_pdf_upload(uploaded_file, subfolder='teacher_notices')
            saved_doc_path = saved['stored_path']
            original_filename = saved['original_filename']

            # Insert into documents table with pending approval & indexing
            execute_db(
                """
                INSERT INTO documents (title, original_filename, stored_path, uploaded_by, uploader_role, approval_status, indexing_status)
                VALUES (?, ?, ?, ?, 'teacher', 'pending', 'not_indexed')
                """,
                (title, original_filename, saved_doc_path, teacher_id)
            )
        except ValueError as ve:
            return jsonify({'status': 'error', 'message': str(ve)}), 400
        except Exception as e:
            return jsonify({'status': 'error', 'message': f"Failed to upload PDF: {str(e)}"}), 500

    # Insert into teacher_submissions
    submission_id = execute_db(
        """
        INSERT INTO teacher_submissions (
            teacher_id, title, description, category, announcement_type, event_date,
            deadline, registration_link, course, document_path, submission_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        """,
        (
            teacher_id, title, description, category, announcement_type, event_date,
            deadline, registration_link, course, saved_doc_path
        )
    )

    return jsonify({
        'status': 'success',
        'message': 'Announcement submitted successfully. An administrator will review and approve it before publication.',
        'submission_id': submission_id,
        'has_document': bool(saved_doc_path)
    }), 201


@teacher_bp.route('/my-submissions', methods=['GET'])
@role_required('teacher')
def get_my_submissions():
    """
    Retrieve all announcements and documents submitted by the authenticated teacher.
    Includes current approval status and administrator feedback.
    """
    teacher_id = request.current_user['id']

    submissions = query_db(
        """
        SELECT id, title, description, category, event_date, deadline,
               registration_link, course, document_path, submission_status,
               admin_feedback, submitted_at, reviewed_at
        FROM teacher_submissions
        WHERE teacher_id = ?
        ORDER BY submitted_at DESC
        """,
        (teacher_id,)
    )

    return jsonify({
        'status': 'success',
        'count': len(submissions),
        'submissions': submissions
    }), 200
