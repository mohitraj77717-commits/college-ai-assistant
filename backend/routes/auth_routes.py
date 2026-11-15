import json
from flask import Blueprint, request, jsonify
from config import Config
from database import query_db, execute_db
from auth import (
    hash_password,
    verify_password,
    generate_token,
    validate_email,
    token_required
)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


# =====================================================================
# Student Authentication
# =====================================================================

@auth_bp.route('/student/register', methods=['POST'])
def register_student():
    """
    Register a new student account.
    Creates student record, hashes password, and initializes preferences.
    """
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    roll_number = data.get('roll_number', '').strip().upper()
    course = data.get('course', '').strip()
    password = data.get('password', '')
    interests = data.get('interests', [])

    # Validation
    if not all([name, email, roll_number, course, password]):
        return jsonify({
            'status': 'error',
            'message': 'All fields (name, email, roll_number, course, password) are required.'
        }), 400

    if not validate_email(email):
        return jsonify({
            'status': 'error',
            'message': 'Please provide a valid email address.'
        }), 400

    if len(password) < 6:
        return jsonify({
            'status': 'error',
            'message': 'Password must be at least 6 characters long.'
        }), 400

    # Check for existing email or roll number
    existing = query_db(
        "SELECT id, email, roll_number FROM students WHERE email = ? OR roll_number = ?",
        (email, roll_number),
        one=True
    )
    if existing:
        if existing['email'] == email:
            return jsonify({'status': 'error', 'message': 'A student with this email already exists.'}), 409
        if existing['roll_number'] == roll_number:
            return jsonify({'status': 'error', 'message': 'A student with this roll number already exists.'}), 409

    pwd_hash = hash_password(password)

    # Insert student record
    student_id = execute_db(
        """
        INSERT INTO students (name, email, roll_number, course, password_hash)
        VALUES (?, ?, ?, ?, ?)
        """,
        (name, email, roll_number, course, pwd_hash)
    )

    # Initialize default student preferences
    interests_json = json.dumps(interests if isinstance(interests, list) else [])
    execute_db(
        """
        INSERT INTO student_preferences (student_id, interests, event_notifications_enabled, academic_notifications_enabled)
        VALUES (?, ?, 1, 1)
        """,
        (student_id, interests_json)
    )

    user_info = {
        'id': student_id,
        'name': name,
        'email': email,
        'roll_number': roll_number,
        'course': course,
        'role': 'student',
        'interests': interests if isinstance(interests, list) else []
    }
    token = generate_token(student_id, 'student', email)

    return jsonify({
        'status': 'success',
        'message': 'Student registration successful.',
        'user': user_info,
        'token': token
    }), 201


@auth_bp.route('/student/login', methods=['POST'])
def login_student():
    """
    Authenticate a student with email/roll_number and password.
    """
    data = request.get_json() or {}
    identifier = data.get('identifier', '').strip().lower()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    login_id = email or identifier
    if not login_id or not password:
        return jsonify({
            'status': 'error',
            'message': 'Email/Roll Number and password are required.'
        }), 400

    # Allow login by email or roll number
    student = query_db(
        """
        SELECT s.id, s.name, s.email, s.roll_number, s.course, s.password_hash,
               p.interests, p.event_notifications_enabled, p.academic_notifications_enabled
        FROM students s
        LEFT JOIN student_preferences p ON s.id = p.student_id
        WHERE LOWER(s.email) = ? OR UPPER(s.roll_number) = ?
        """,
        (login_id, login_id.upper()),
        one=True
    )

    if not student or not verify_password(password, student['password_hash']):
        return jsonify({
            'status': 'error',
            'message': 'Invalid credentials. Please verify your email/roll number and password.'
        }), 401

    interests = []
    if student.get('interests'):
        try:
            interests = json.loads(student['interests'])
        except Exception:
            interests = []

    user_info = {
        'id': student['id'],
        'name': student['name'],
        'email': student['email'],
        'roll_number': student['roll_number'],
        'course': student['course'],
        'role': 'student',
        'interests': interests,
        'event_notifications_enabled': bool(student.get('event_notifications_enabled', 1)),
        'academic_notifications_enabled': bool(student.get('academic_notifications_enabled', 1))
    }
    token = generate_token(student['id'], 'student', student['email'])

    return jsonify({
        'status': 'success',
        'message': 'Login successful.',
        'user': user_info,
        'token': token
    }), 200


# =====================================================================
# Teacher Authentication & Approval Workflow
# =====================================================================

@auth_bp.route('/teacher/register', methods=['POST'])
def register_teacher():
    """
    Register a teacher account.
    All new teachers are set to 'pending' and require administrator approval.
    """
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    department = data.get('department', '').strip()
    password = data.get('password', '')

    if not all([name, email, department, password]):
        return jsonify({
            'status': 'error',
            'message': 'All fields (name, email, department, password) are required.'
        }), 400

    if not validate_email(email):
        return jsonify({'status': 'error', 'message': 'Please provide a valid official email address.'}), 400

    if len(password) < 6:
        return jsonify({'status': 'error', 'message': 'Password must be at least 6 characters long.'}), 400

    existing = query_db("SELECT id FROM teachers WHERE email = ?", (email,), one=True)
    if existing:
        return jsonify({'status': 'error', 'message': 'A teacher with this email is already registered.'}), 409

    pwd_hash = hash_password(password)

    execute_db(
        """
        INSERT INTO teachers (name, email, department, password_hash, approval_status)
        VALUES (?, ?, ?, ?, 'pending')
        """,
        (name, email, department, pwd_hash)
    )

    return jsonify({
        'status': 'success',
        'message': 'Teacher account registered successfully. Your account is pending administrator approval before you can log in.',
        'approval_status': 'pending'
    }), 201


@auth_bp.route('/teacher/login', methods=['POST'])
def login_teacher():
    """
    Authenticate a teacher account.
    Blocks login if approval_status is 'pending' or 'rejected'.
    """
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'status': 'error', 'message': 'Email and password are required.'}), 400

    teacher = query_db(
        "SELECT id, name, email, department, password_hash, approval_status FROM teachers WHERE email = ?",
        (email,),
        one=True
    )

    if not teacher or not verify_password(password, teacher['password_hash']):
        return jsonify({'status': 'error', 'message': 'Invalid email or password.'}), 401

    status = teacher['approval_status']
    if status == 'pending':
        return jsonify({
            'status': 'error',
            'error': 'AccountPendingApproval',
            'message': 'Your account is pending administrator approval. You will be able to log in once an administrator approves your account.'
        }), 403

    if status == 'rejected':
        return jsonify({
            'status': 'error',
            'error': 'AccountRejected',
            'message': 'Your teacher registration was reviewed and rejected by the administrator.'
        }), 403

    user_info = {
        'id': teacher['id'],
        'name': teacher['name'],
        'email': teacher['email'],
        'department': teacher['department'],
        'role': 'teacher',
        'approval_status': 'approved'
    }
    token = generate_token(teacher['id'], 'teacher', teacher['email'])

    return jsonify({
        'status': 'success',
        'message': 'Login successful.',
        'user': user_info,
        'token': token
    }), 200


# =====================================================================
# Administrator Setup & Authentication
# =====================================================================

@auth_bp.route('/admin/status', methods=['GET'])
def admin_status():
    """
    Check if an initial administrator has been configured in the system.
    """
    admin_count = query_db("SELECT COUNT(*) AS count FROM admins", one=True)['count']
    return jsonify({
        'status': 'success',
        'admin_exists': admin_count > 0,
        'admin_count': admin_count
    }), 200


@auth_bp.route('/admin/setup', methods=['POST'])
def bootstrap_admin():
    """
    Secure one-time bootstrap setup for the initial administrator.
    Requires the ADMIN_SETUP_KEY from backend/.env.
    Locked once an administrator already exists.
    """
    data = request.get_json() or {}
    setup_key = data.get('setup_key', '').strip()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    admin_count = query_db("SELECT COUNT(*) AS count FROM admins", one=True)['count']
    if admin_count > 0:
        return jsonify({
            'status': 'error',
            'message': 'Initial administrator setup is locked. An administrator account already exists.'
        }), 403

    if not setup_key or setup_key != Config.ADMIN_SETUP_KEY:
        return jsonify({
            'status': 'error',
            'message': 'Invalid administrator bootstrap setup key.'
        }), 401

    if not all([name, email, password]):
        return jsonify({
            'status': 'error',
            'message': 'Name, email, and password are required to create the administrator account.'
        }), 400

    if not validate_email(email):
        return jsonify({'status': 'error', 'message': 'Please provide a valid email address.'}), 400

    if len(password) < 6:
        return jsonify({'status': 'error', 'message': 'Password must be at least 6 characters long.'}), 400

    pwd_hash = hash_password(password)

    admin_id = execute_db(
        "INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)",
        (name, email, pwd_hash)
    )

    user_info = {
        'id': admin_id,
        'name': name,
        'email': email,
        'role': 'admin'
    }
    token = generate_token(admin_id, 'admin', email)

    return jsonify({
        'status': 'success',
        'message': 'Initial administrator account created successfully.',
        'user': user_info,
        'token': token
    }), 201


@auth_bp.route('/admin/login', methods=['POST'])
def login_admin():
    """
    Authenticate an administrator.
    """
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'status': 'error', 'message': 'Email and password are required.'}), 400

    admin = query_db(
        "SELECT id, name, email, password_hash FROM admins WHERE email = ?",
        (email,),
        one=True
    )

    if not admin or not verify_password(password, admin['password_hash']):
        return jsonify({'status': 'error', 'message': 'Invalid administrator email or password.'}), 401

    user_info = {
        'id': admin['id'],
        'name': admin['name'],
        'email': admin['email'],
        'role': 'admin'
    }
    token = generate_token(admin['id'], 'admin', admin['email'])

    return jsonify({
        'status': 'success',
        'message': 'Administrator login successful.',
        'user': user_info,
        'token': token
    }), 200


# =====================================================================
# Profile & Session Management
# =====================================================================

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user_profile():
    """
    Get profile and permissions for the currently authenticated user.
    """
    user = dict(request.current_user)

    # Attach preferences if user is student
    if user.get('role') == 'student':
        prefs = query_db(
            "SELECT interests, event_notifications_enabled, academic_notifications_enabled FROM student_preferences WHERE student_id = ?",
            (user['id'],),
            one=True
        )
        if prefs:
            try:
                user['interests'] = json.loads(prefs['interests']) if prefs['interests'] else []
            except Exception:
                user['interests'] = []
            user['event_notifications_enabled'] = bool(prefs.get('event_notifications_enabled', 1))
            user['academic_notifications_enabled'] = bool(prefs.get('academic_notifications_enabled', 1))

    return jsonify({
        'status': 'success',
        'user': user
    }), 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Client-side session logout confirmation.
    """
    return jsonify({
        'status': 'success',
        'message': 'Logged out successfully.'
    }), 200
