import functools
import re
from flask import request, jsonify
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config
from database import query_db

# Initialize tokenizer with the application SECRET_KEY
serializer = URLSafeTimedSerializer(Config.SECRET_KEY)
# Token validity: 7 days in seconds
TOKEN_MAX_AGE = 7 * 24 * 60 * 60


def hash_password(password: str) -> str:
    """Hash plaintext password using PBKDF2 with SHA-256."""
    return generate_password_hash(password, method='pbkdf2:sha256')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify plaintext password against PBKDF2 hash."""
    return check_password_hash(password_hash, password)


def generate_token(user_id: int, role: str, email: str) -> str:
    """Generate a signed cryptographic token for an authenticated user."""
    return serializer.dumps({
        'user_id': user_id,
        'role': role,
        'email': email
    })


def verify_token(token: str) -> dict:
    """
    Verify and decode a signed token.
    Raises SignatureExpired or BadSignature if invalid or expired.
    """
    return serializer.loads(token, max_age=TOKEN_MAX_AGE)


def validate_email(email: str) -> bool:
    """Basic email regex validation."""
    if not email or len(email) > 120:
        return False
    email_regex = r'^[\w\.-]+@([\w-]+\.)+[\w-]{2,4}$'
    return bool(re.match(email_regex, email))


def get_token_from_header() -> str:
    """Extract Bearer token from HTTP Authorization header."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header:
        return None
    parts = auth_header.split(' ')
    if len(parts) == 2 and parts[0].lower() == 'bearer':
        return parts[1]
    return None


def token_required(f):
    """
    Decorator to protect API endpoints.
    Validates token and binds the active user record to request.current_user.
    """
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = get_token_from_header()
        if not token:
            return jsonify({
                'status': 'error',
                'error': 'Unauthorized',
                'message': 'Authentication token is required. Please log in.'
            }), 401

        try:
            payload = verify_token(token)
        except SignatureExpired:
            return jsonify({
                'status': 'error',
                'error': 'TokenExpired',
                'message': 'Your session has expired. Please log in again.'
            }), 401
        except BadSignature:
            return jsonify({
                'status': 'error',
                'error': 'InvalidToken',
                'message': 'Invalid authentication token.'
            }), 401

        user_id = payload.get('user_id')
        role = payload.get('role')

        # Retrieve user from corresponding table based on role
        if role == 'student':
            user = query_db(
                "SELECT id, name, email, roll_number, course, created_at FROM students WHERE id = ?",
                (user_id,),
                one=True
            )
        elif role == 'teacher':
            user = query_db(
                "SELECT id, name, email, department, approval_status, created_at FROM teachers WHERE id = ?",
                (user_id,),
                one=True
            )
            # Ensure teacher is still approved
            if user and user.get('approval_status') != 'approved':
                return jsonify({
                    'status': 'error',
                    'error': 'Forbidden',
                    'message': 'Teacher account is not approved by administrator.'
                }), 403
        elif role == 'admin':
            user = query_db(
                "SELECT id, name, email, created_at FROM admins WHERE id = ?",
                (user_id,),
                one=True
            )
        else:
            user = None

        if not user:
            return jsonify({
                'status': 'error',
                'error': 'UserNotFound',
                'message': 'The user associated with this token no longer exists.'
            }), 401

        # Attach role and user record to request context
        user_data = dict(user)
        user_data['role'] = role
        request.current_user = user_data

        return f(*args, **kwargs)

    return decorated


def role_required(*allowed_roles):
    """
    Decorator to enforce Role-Based Access Control (RBAC).
    Usage: @role_required('admin') or @role_required('admin', 'teacher')
    """
    def decorator(f):
        @functools.wraps(f)
        @token_required
        def decorated(*args, **kwargs):
            current_user = getattr(request, 'current_user', None)
            if not current_user or current_user.get('role') not in allowed_roles:
                return jsonify({
                    'status': 'error',
                    'error': 'Forbidden',
                    'message': f"Access denied. Requires one of the following roles: {', '.join(allowed_roles)}"
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
